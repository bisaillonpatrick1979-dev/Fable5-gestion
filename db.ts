// Charge .env avant de lire process.env ci-dessous : ce module est importé en
// tête de server.ts, donc son code s'exécute avant l'appel dotenv.config() de
// server.ts (l'évaluation des imports ES précède le corps du module).
import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseEnabled = !!(supabaseUrl && supabaseServiceKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(supabaseUrl as string, supabaseServiceKey as string, { auth: { persistSession: false } })
  : null;

// Tables portant une colonne company_id (entreprise mono-tenant : une seule ligne dans "companies")
export const TABLES_WITH_COMPANY_ID = new Set([
  'app_users', 'projects', 'punches', 'catalog_items', 'suppliers', 'inventory_items',
  'supplier_orders', 'clients', 'documents', 'payroll_entries', 'payroll_payments',
  'production_entries', 'motivation_teams', 'motivation_goals', 'hr_alerts', 'expenses'
]);

// Tables dont la clé primaire n'est pas "id"
export const TABLE_ID_COLUMN: Record<string, string> = {
  weekly_goals: 'employee_id'
};

let cachedCompanyId: string | null = null;

// Entreprise mono-tenant : une seule ligne dans "companies", créée au besoin.
export async function resolveCompanyId(): Promise<string> {
  if (cachedCompanyId) return cachedCompanyId;
  if (!supabase) throw new Error('Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants)');

  const { data: existing, error: selectErr } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (selectErr) throw selectErr;

  if (existing) {
    cachedCompanyId = existing.id as string;
    return cachedCompanyId;
  }

  const { data: created, error: insertErr } = await supabase
    .from('companies')
    .insert({ name: 'Votre Entreprise Inc.' })
    .select('id')
    .single();
  if (insertErr) throw insertErr;

  cachedCompanyId = created.id as string;
  return cachedCompanyId;
}

// Vérifie le rôle réel d'un employé depuis la base plutôt que de faire confiance
// à un rôle fourni par le client, pour empêcher un employé d'usurper l'accès
// admin/comptable simplement en modifiant la requête envoyée au serveur.
export async function resolveEmployeeRole(employeeId: string | undefined | null): Promise<string | null> {
  if (!employeeId || !supabase) return null;
  const { data, error } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', employeeId)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as string;
}
