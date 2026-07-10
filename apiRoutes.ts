// Routes API partagées entre le serveur Node traditionnel (server.ts, utilisé en
// développement et sur un hébergement Node persistant) et la fonction serverless
// Vercel (api/index.ts). Isolé dans son propre module pour être monté sur
// n'importe quelle instance Express sans dupliquer la logique.
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabase, supabaseEnabled, resolveCompanyId, resolveEmployeeRole, TABLES_WITH_COMPANY_ID, TABLE_ID_COLUMN } from './db';

// Toutes les tables exposées par la couche de données générique (voir supabase_migration.sql)
const KNOWN_TABLES = [
  'companies', 'app_users', 'projects', 'project_tools', 'project_assignments', 'project_tasks',
  'punches', 'catalog_items', 'suppliers', 'inventory_items', 'supplier_orders', 'supplier_order_items',
  'clients', 'documents', 'document_items', 'document_payments', 'payroll_entries', 'payroll_payments',
  'production_entries', 'weekly_goals', 'motivation_teams', 'motivation_goals', 'hr_alerts', 'expenses'
];

// Rôles autorisés à parler à l'IA Comptable/Secrétaire (accès aux chiffres de la compagnie,
// à la gestion de matériel/inventaire et à la gestion des payes).
// Tous les autres rôles (ex: 'employee') sont limités à l'IA Ingénieur, qui n'a
// accès à aucune donnée financière ou interne de l'entreprise.
const FINANCIAL_ACCESS_ROLES = new Set(['admin', 'accountant', 'secretary']);

// Détermine le rôle réel d'un employé pour la vérification d'accès à l'IA Comptable/Secrétaire.
// - Si Supabase est configuré (déploiement multi-appareils), le rôle est TOUJOURS revérifié
//   côté serveur via la table app_users, sans jamais faire confiance au client.
// - Si Supabase n'est PAS configuré, l'application tourne entièrement en LocalStorage sur
//   l'appareil de l'utilisateur : il n'existe alors aucune base serveur faisant autorité à
//   protéger (l'employé actif vient déjà de sélectionner son propre profil sur cet appareil),
//   donc on retombe sur le rôle déclaré par le client plutôt que de bloquer inconditionnellement
//   l'IA gestionnaire pour l'administration.
async function resolveEffectiveRole(employeeId: string | undefined, claimedRole: string | undefined): Promise<{ role: string | null; verified: boolean }> {
  if (supabaseEnabled) {
    const role = await resolveEmployeeRole(employeeId);
    return { role, verified: true };
  }
  return { role: claimedRole || null, verified: false };
}

const EXPENSE_CATEGORIES = ['materials', 'tools', 'fuel', 'rental', 'subcontractor', 'admin', 'other'] as const;

type AiMode = 'engineer' | 'accountant';

// Prompt de l'IA Ingénieur : uniquement code du bâtiment / sécurité de chantier,
// disponible à tous les employés. Instruction explicite de ne jamais discuter
// des chiffres ou données internes de l'entreprise, même si on le lui demande.
function buildEngineerSystemInstruction(regionLabel: string | undefined, country: 'CA' | 'US' | undefined): string {
  const location = regionLabel && regionLabel.trim() ? regionLabel.trim() : 'Amérique du Nord';
  const codeFramework = country === 'US'
    ? `le International Building Code (IBC) / International Residential Code (IRC) tel qu'adopté avec ses amendements locaux en ${location}`
    : `le Code national du bâtiment du Canada (CNB) et le code du bâtiment provincial applicable en ${location}`;
  return `
    Tu es "l'IA Ingénieur" de l'application de gestion de chantier "Gestion Chantier Pro", une entreprise de pose de toiture et parement extérieur basée en ${location}.
    Tu es accessible à TOUS les employés (pas seulement l'administration).

    Ton rôle est strictement limité à :
    - Le code du bâtiment applicable (réfère-toi à ${codeFramework}), les normes de pose de toiture/parement, l'isolation, la ventilation, les fondations.
    - La santé et sécurité sur les chantiers.
    - Les bonnes pratiques de construction, calculs de matériaux, et méthodes de pose.

    Règles impératives :
    - Adapte systématiquement tes réponses à la juridiction ${location} — ne présume jamais qu'on est au Québec sauf si précisé, et les codes provinciaux/étatiques varient tous entre eux.
    - Précise toujours que le code cité est une référence générale et que la conformité finale doit être validée auprès de l'inspecteur en bâtiment local ou d'un ingénieur licencié, car les codes du bâtiment sont légalement contraignants et évoluent.
    - Tu n'as PAS accès aux chiffres de l'entreprise, à la comptabilité, aux salaires, aux marges ou à toute donnée financière ou interne. Si on te pose une question de cette nature, réponds poliment que cette information est réservée à l'IA Comptable/Secrétaire, accessible uniquement à l'administration.
    - Réponds de manière concise, professionnelle et technique.
  `;
}

// Prompt de l'IA Gestionnaire (Comptable/Secrétaire) : gestion complète de l'entreprise —
// comptabilité, gestion de matériel/inventaire, gestion des payes et administration de
// l'application (accès réservé à l'administration — vérifié côté serveur, pas seulement
// côté client).
function buildAccountantSystemInstruction(regionLabel: string | undefined, companyName: string | undefined): string {
  const location = regionLabel && regionLabel.trim() ? regionLabel.trim() : 'Amérique du Nord';
  const name = companyName && companyName.trim() ? companyName.trim() : 'l\'entreprise';
  return `
    Tu es "l'IA Gestionnaire" (Comptable/Secrétaire) de ${name}, une entreprise de pose de toiture et parement extérieur basée en ${location}.
    Tu es accessible UNIQUEMENT à l'administration/au propriétaire — jamais aux employés de chantier.

    Ton rôle couvre l'ensemble de la gestion de l'entreprise :
    - Comptabilité : catégoriser les dépenses, analyser les entrées d'argent et la rentabilité des chantiers,
      rédiger des bons de commande et de la correspondance.
    - Gestion de matériel/inventaire : aider à planifier les commandes de matériaux, repérer les seuils
      critiques, comparer les fournisseurs et optimiser les achats.
    - Gestion des payes : aider à calculer les heures, les taux, les vacances, les retenues et charges
      sociales applicables, et à préparer les payes — toujours en te basant sur les règles de ${location}.
    - Gestion de l'application : conseiller sur la configuration de l'entreprise, des employés, des rôles
      et des réglages de l'application de gestion de chantier.
    Base tes réponses de conformité, de charges sociales et de taxes sur les règles applicables en ${location} —
    ne présume jamais que l'entreprise est au Québec à moins que ce soit précisé.
    Rappelle, si la question porte sur une obligation fiscale ou légale précise, qu'un comptable ou
    fiscaliste certifié devrait valider les décisions finales — tu assistes, tu ne remplaces pas ce professionnel.
    Réponds de manière concise, polie et professionnelle.
  `;
}

interface ImageInput {
  base64: string;
  mimeType: string;
}

async function callGemini(message: string, apiKey: string, systemInstruction: string, image?: ImageInput): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  const parts: any[] = [{ text: `Système: ${systemInstruction}\n\nClient message: ${message}` }];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [{ role: 'user', parts }],
  });
  return response.text || '';
}

async function parseJsonSafely(res: Response, providerLabel: string): Promise<any> {
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Réponse invalide de l'API ${providerLabel} (HTTP ${res.status}). Vérifiez votre connexion ou réessayez plus tard.`);
  }
}

async function callAnthropic(message: string, apiKey: string, systemInstruction: string, image?: ImageInput): Promise<string> {
  const content: any[] = [];
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } });
  }
  content.push({ type: 'text', text: message });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemInstruction,
      messages: [{ role: 'user', content }]
    })
  });
  const data = await parseJsonSafely(res, 'Anthropic');
  if (!res.ok) {
    throw new Error(data?.error?.message || `Anthropic API error (${res.status})`);
  }
  return data?.content?.[0]?.text || '';
}

async function callOpenAI(message: string, apiKey: string, systemInstruction: string, image?: ImageInput): Promise<string> {
  const userContent: any = image
    ? [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } }
      ]
    : message;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userContent }
      ]
    })
  });
  const data = await parseJsonSafely(res, 'OpenAI');
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI API error (${res.status})`);
  }
  return data?.choices?.[0]?.message?.content || '';
}

// DeepSeek expose une API compatible avec le format chat completions d'OpenAI.
// Pas de support vision à ce jour : utilisé pour le chat texte seulement.
async function callDeepSeek(message: string, apiKey: string, systemInstruction: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: message }
      ]
    })
  });
  const data = await parseJsonSafely(res, 'DeepSeek');
  if (!res.ok) {
    throw new Error(data?.error?.message || `DeepSeek API error (${res.status})`);
  }
  return data?.choices?.[0]?.message?.content || '';
}

const PROVIDER_ENV_KEYS: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY'
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  deepseek: 'DeepSeek'
};

const VISION_CAPABLE_PROVIDERS = new Set(['gemini', 'anthropic', 'openai']);

// Détecte le fournisseur à partir du format de la clé API elle-même. Sert de filet de
// sécurité quand le fournisseur choisi dans les Réglages ne correspond pas à la clé
// réellement collée (ex: une clé Anthropic collée alors que le fournisseur sélectionné
// est resté sur sa valeur par défaut) — évite de renvoyer une erreur d'authentification
// cryptique du mauvais fournisseur alors qu'une clé valide a bel et bien été fournie.
function detectProviderFromKey(apiKey: string): string | null {
  const key = apiKey.trim();
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('sk-proj-') || key.startsWith('sk-svcacct-')) return 'openai';
  return null;
}

function resolveProviderForKey(requestedProvider: string, apiKey: string): string {
  const detected = detectProviderFromKey(apiKey);
  return detected && detected !== requestedProvider ? detected : requestedProvider;
}

async function callProvider(selectedProvider: string, message: string, apiKey: string, systemInstruction: string, image?: ImageInput): Promise<string> {
  if (selectedProvider === 'anthropic') return callAnthropic(message, apiKey, systemInstruction, image);
  if (selectedProvider === 'openai') return callOpenAI(message, apiKey, systemInstruction, image);
  if (selectedProvider === 'deepseek') return callDeepSeek(message, apiKey, systemInstruction);
  return callGemini(message, apiKey, systemInstruction, image);
}

function requireKnownTable(table: string, res: express.Response): boolean {
  if (!KNOWN_TABLES.includes(table)) {
    res.status(404).json({ error: `Table inconnue : ${table}` });
    return false;
  }
  return true;
}

// Monte toutes les routes /api/* sur une instance Express donnée. Suppose que
// express.json() a déjà été appliqué en middleware par l'appelant (avec une
// limite de taille suffisante pour les photos de factures en base64).
export function registerApiRoutes(app: express.Express): void {
  // Diagnostic rapide depuis un navigateur : confirme que la fonction API tourne
  // et quelles intégrations sont configurées côté serveur — sans jamais exposer
  // les valeurs des clés. Si cette URL renvoie une page HTML au lieu de ce JSON,
  // c'est que quelque chose (protection de déploiement, rewrite, crash) intercepte
  // les requêtes avant qu'elles n'atteignent l'API.
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      supabaseConfigured: supabaseEnabled,
      serverKeys: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY
      }
    });
  });

  // API Route for AI Agent chat (Gemini / Anthropic / OpenAI / DeepSeek).
  // Deux personas : 'engineer' (tous les employés, aucune donnée financière) et
  // 'accountant' (administration seulement). Le rôle est re-vérifié côté serveur
  // via l'employeeId — jamais en se fiant uniquement à ce que le client prétend.
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, provider, apiKey: clientApiKey, regionLabel, country, companyName, mode, employeeId, employeeRole } = req.body;
      const requestedMode: AiMode = mode === 'accountant' ? 'accountant' : 'engineer';

      let effectiveMode: AiMode = requestedMode;
      let deniedReason: string | null = null;
      if (requestedMode === 'accountant') {
        const { role, verified } = await resolveEffectiveRole(employeeId, employeeRole);
        if (!role || !FINANCIAL_ACCESS_ROLES.has(role)) {
          // Rétrograde vers l'IA Ingénieur plutôt que de renvoyer les chiffres de
          // l'entreprise à quelqu'un qui n'y a pas droit, mais explique pourquoi
          // (au lieu de rétrograder silencieusement, ce qui donnait l'impression
          // que "l'IA ne fonctionne pas" à un administrateur légitime).
          effectiveMode = 'engineer';
          deniedReason = verified
            ? "Accès à l'IA Gestionnaire réservé à l'administration/comptabilité/secrétariat."
            : "Impossible de vérifier votre rôle (sélectionnez votre profil employé avant d'utiliser l'IA Gestionnaire).";
        }
      }

      // Le fournisseur par défaut est Anthropic Claude ; on corrige aussi automatiquement
      // le fournisseur si la clé fournie ne correspond manifestement pas à celui sélectionné
      // (ex: clé Anthropic collée alors que le fournisseur est resté sur sa valeur par défaut).
      const requestedProvider: string = provider && PROVIDER_ENV_KEYS[provider] ? provider : 'anthropic';
      const selectedProvider: string = (clientApiKey && clientApiKey.trim())
        ? resolveProviderForKey(requestedProvider, clientApiKey)
        : requestedProvider;
      const envKey = process.env[PROVIDER_ENV_KEYS[selectedProvider]];
      const apiKey = (clientApiKey && clientApiKey.trim()) || envKey;
      const systemInstruction = effectiveMode === 'accountant'
        ? buildAccountantSystemInstruction(regionLabel, companyName)
        : buildEngineerSystemInstruction(regionLabel, country === 'US' ? 'US' : 'CA');

      if (!apiKey || apiKey.trim() === '') {
        return res.json({
          reply: `🤖 L'assistant IA fonctionne en mode simulation locale car aucune clé API n'est configurée pour ${PROVIDER_LABELS[selectedProvider]}. Ajoutez votre clé API dans Réglages > Assistant IA pour l'activer.`,
          simulated: true,
          mode: effectiveMode,
          deniedReason
        });
      }

      const text = await callProvider(selectedProvider, message, apiKey, systemInstruction);
      return res.json({ reply: text, mode: effectiveMode, provider: selectedProvider, deniedReason });
    } catch (error: any) {
      console.error('Error on /api/chat:', error);
      return res.status(500).json({ error: error.message || 'Error occurred while calling the AI provider' });
    }
  });

  // Scan de facture par photo : l'IA extrait fournisseur/montant/taxe/date et
  // suggère une catégorie de dépense. Réservé à l'administration (comptabilité),
  // vérifié côté serveur comme pour /api/chat.
  app.post('/api/receipts/scan', async (req, res) => {
    try {
      const { imageBase64, mimeType, provider, apiKey: clientApiKey, employeeId, employeeRole } = req.body;
      const { role } = await resolveEffectiveRole(employeeId, employeeRole);
      if (!role || !FINANCIAL_ACCESS_ROLES.has(role)) {
        return res.status(403).json({ error: "Accès réservé à l'administration." });
      }
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: 'Image manquante' });
      }

      const requestedProvider: string = provider && PROVIDER_ENV_KEYS[provider] ? provider : 'anthropic';
      const selectedProvider: string = (clientApiKey && clientApiKey.trim())
        ? resolveProviderForKey(requestedProvider, clientApiKey)
        : requestedProvider;
      if (!VISION_CAPABLE_PROVIDERS.has(selectedProvider)) {
        return res.status(400).json({ error: `${PROVIDER_LABELS[selectedProvider]} ne supporte pas l'analyse de photo. Choisissez Gemini, Anthropic ou OpenAI pour scanner une facture.` });
      }
      const envKey = process.env[PROVIDER_ENV_KEYS[selectedProvider]];
      const apiKey = (clientApiKey && clientApiKey.trim()) || envKey;
      if (!apiKey || apiKey.trim() === '') {
        return res.status(400).json({ error: 'Aucune clé API configurée pour scanner une facture.' });
      }

      const instruction = `Tu extrais les données d'une photo de facture ou reçu de dépense de chantier.
Réponds STRICTEMENT en JSON valide, sans texte autour, avec ce format exact :
{"provider": string, "amount": number, "tax": number, "date": "YYYY-MM-DD", "category": one of ${JSON.stringify(EXPENSE_CATEGORIES)}, "notes": string}
"amount" est le total avant taxes, "tax" est le montant total des taxes. Si une valeur est illisible, mets une chaîne vide ou 0. Choisis la catégorie la plus proche du contenu de la facture (ex: petit outillage/outils pneumatiques -> "tools", essence/transport -> "fuel", location d'équipement -> "rental").`;

      const raw = await callProvider(selectedProvider, 'Voici la photo de la facture à analyser.', apiKey, instruction, { base64: imageBase64, mimeType });
      const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return res.status(502).json({ error: "L'IA n'a pas retourné un résultat exploitable. Réessayez avec une photo plus nette." });
      }
      if (!EXPENSE_CATEGORIES.includes(parsed.category)) {
        parsed.category = 'other';
      }
      return res.json(parsed);
    } catch (error: any) {
      console.error('Error on /api/receipts/scan:', error);
      return res.status(500).json({ error: error.message || 'Erreur lors du scan de la facture' });
    }
  });

  // -------------------------------------------------------------------------
  // Couche de données générique branchée sur Supabase (voir db.ts et
  // supabase_migration.sql). Chaque action du store applicatif passe par ces
  // routes REST au lieu d'écrire directement dans LocalStorage.
  // -------------------------------------------------------------------------

  // Hydratation complète au démarrage de l'application : toutes les tables en un seul appel
  app.get('/api/hydrate', async (_req, res) => {
    if (!supabaseEnabled || !supabase) {
      return res.json({ enabled: false });
    }
    try {
      const companyId = await resolveCompanyId();
      const results: Record<string, any> = { enabled: true, companyId };
      for (const table of KNOWN_TABLES) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        results[table] = data;
      }
      return res.json(results);
    } catch (error: any) {
      console.error('Error on /api/hydrate:', error);
      return res.status(500).json({ error: error.message || 'Erreur de chargement des données' });
    }
  });

  // Liste (avec filtre optionnel par company_id pour les tables mono-tenant)
  app.get('/api/db/:table', async (req, res) => {
    if (!supabaseEnabled || !supabase) return res.status(503).json({ error: 'Base de données non configurée' });
    const { table } = req.params;
    if (!requireKnownTable(table, res)) return;
    try {
      let query = supabase.from(table).select('*');
      if (TABLES_WITH_COMPANY_ID.has(table)) {
        const companyId = await resolveCompanyId();
        query = query.eq('company_id', companyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.json(data);
    } catch (error: any) {
      console.error(`Error on GET /api/db/${table}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Création d'une ligne (injecte automatiquement company_id si applicable et absent)
  app.post('/api/db/:table', async (req, res) => {
    if (!supabaseEnabled || !supabase) return res.status(503).json({ error: 'Base de données non configurée' });
    const { table } = req.params;
    if (!requireKnownTable(table, res)) return;
    try {
      const payload = { ...req.body };
      if (TABLES_WITH_COMPANY_ID.has(table) && !payload.company_id) {
        payload.company_id = await resolveCompanyId();
      }
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return res.json(data);
    } catch (error: any) {
      console.error(`Error on POST /api/db/${table}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Upsert générique (utile pour les tables clé-primaire naturelle, ex: weekly_goals)
  app.put('/api/db/:table', async (req, res) => {
    if (!supabaseEnabled || !supabase) return res.status(503).json({ error: 'Base de données non configurée' });
    const { table } = req.params;
    if (!requireKnownTable(table, res)) return;
    try {
      const payload = { ...req.body };
      if (TABLES_WITH_COMPANY_ID.has(table) && !payload.company_id) {
        payload.company_id = await resolveCompanyId();
      }
      const { data, error } = await supabase.from(table).upsert(payload).select().single();
      if (error) throw error;
      return res.json(data);
    } catch (error: any) {
      console.error(`Error on PUT /api/db/${table}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Mise à jour partielle d'une ligne existante par identifiant
  app.patch('/api/db/:table/:id', async (req, res) => {
    if (!supabaseEnabled || !supabase) return res.status(503).json({ error: 'Base de données non configurée' });
    const { table, id } = req.params;
    if (!requireKnownTable(table, res)) return;
    try {
      const idColumn = TABLE_ID_COLUMN[table] || 'id';
      const { data, error } = await supabase.from(table).update(req.body).eq(idColumn, id).select().single();
      if (error) throw error;
      return res.json(data);
    } catch (error: any) {
      console.error(`Error on PATCH /api/db/${table}/${id}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Suppression d'une ligne par identifiant
  app.delete('/api/db/:table/:id', async (req, res) => {
    if (!supabaseEnabled || !supabase) return res.status(503).json({ error: 'Base de données non configurée' });
    const { table, id } = req.params;
    if (!requireKnownTable(table, res)) return;
    try {
      const idColumn = TABLE_ID_COLUMN[table] || 'id';
      const { error } = await supabase.from(table).delete().eq(idColumn, id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error: any) {
      console.error(`Error on DELETE /api/db/${table}/${id}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });
}
