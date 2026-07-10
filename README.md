# Fable5 Gestion

Application mobile-first de gestion de chantier (punches, projets, géofencing, inventaire,
paie, facturation) avec deux assistants IA intégrés :

- **IA Ingénieur** — code du bâtiment et sécurité de chantier, adapté à la province/l'état de
  l'entreprise (CNB/codes provinciaux au Canada, IBC/IRC aux États-Unis). Accessible à tous les
  employés.
- **IA Gestionnaire (Comptable/Secrétaire)** — comptabilité, gestion de matériel/inventaire,
  gestion des payes et administration de l'application. Accessible uniquement à l'administration
  (rôle revérifié côté serveur).

Fournisseurs IA supportés au choix (configurables dans **Réglages > Assistant IA**, ou via clé
serveur par défaut) : Anthropic Claude, Google Gemini, OpenAI et DeepSeek.

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Copy `.env.example` vers `.env` et remplissez au minimum :
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` pour partager les données entre appareils
     (sinon l'application fonctionne en mode LocalStorage local uniquement).
   - `ANTHROPIC_API_KEY` (ou une autre clé de fournisseur IA) comme repli serveur si le
     propriétaire n'a pas encore entré sa propre clé dans Réglages > Assistant IA.
3. Run the app:
   `npm run dev`

## Déploiement

- `npm run build` produit le front (Vite) dans `dist/` et bundle `server.ts` en
  `dist/server.cjs` pour un hébergement Node persistant (`npm start`).
- Sur Vercel, `api/index.ts` sert les mêmes routes (`apiRoutes.ts`) en fonction serverless —
  voir `vercel.json`.
