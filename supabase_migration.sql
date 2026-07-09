-- Schéma Supabase pour Fable5-gestion (Gestion Chantier Pro).
-- Entreprise mono-tenant : une seule ligne dans "companies", créée au besoin par db.ts.
-- Toutes les tables sont accédées exclusivement via le serveur Express (clé service_role) —
-- voir apiRoutes.ts / db.ts. Aucun accès direct client -> Supabase, donc RLS reste désactivé.

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  gst_number text,
  qst_number text,
  wcb_number text,
  bn_number text,
  construction_license_number text,
  logo text,
  interac_email text,
  bank_name text,
  bank_transit text,
  bank_institution text,
  bank_account text,
  geofencing_enabled boolean default true,
  vacation_rate numeric,
  legal_minimum_wage numeric,
  voice_reminder_volume integer,
  voice_reminder_schedule text,
  payment_terms text,
  default_late_interest_pct numeric,
  default_warranty_years numeric,
  default_clause_change_order text,
  default_clause_resiliation text,
  payroll_vacation_rate numeric,
  payroll_health_insurance numeric,
  payroll_dental_insurance numeric,
  payroll_life_insurance numeric,
  payroll_ltd numeric,
  payroll_rrsp numeric,
  payroll_eap numeric,
  payroll_custom1_name text,
  payroll_custom1_amount numeric,
  payroll_custom2_name text,
  payroll_custom2_amount numeric,
  is_onboarded boolean default false,
  country text,
  region text,
  tax_rate1 numeric,
  tax_rate2 numeric,
  tax_rate1_name text,
  tax_rate2_name text,
  payment_deposit_pct numeric,
  payment_mid_pct numeric,
  payment_final_pct numeric,
  -- Assistant IA : chaque entreprise choisit son fournisseur et sa propre clé API.
  ai_provider text check (ai_provider in ('gemini', 'anthropic', 'openai', 'deepseek')),
  ai_api_key text,
  created_at timestamptz default now()
);

-- app_users.role gouverne l'accès à l'IA Comptable/Secrétaire (voir resolveEmployeeRole
-- dans db.ts) : seuls 'admin', 'accountant' et 'secretary' y ont accès. 'employee' est
-- limité à l'IA Ingénieur, sans accès aux données financières.
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  avatar_initials text,
  role text not null check (role in ('admin', 'employee', 'accountant', 'secretary')),
  access_code_hash text, -- PIN 4 chiffres
  pay_mode text,
  pay_rate numeric,
  is_active boolean default true,
  worker_type text,
  as_number text,
  phone text,
  address text,
  hire_date date,
  avatar text,
  level integer default 1,
  xp integer default 0,
  contract_renewal_date date,
  vacation_rate_override numeric,
  email text,
  city text,
  province text,
  postal_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  business_name text,
  gst_number text,
  sin text,
  employee_province text,
  pay_frequency text,
  pay_period_start date,
  annual_salary numeric,
  created_at timestamptz default now()
);
create index if not exists idx_app_users_company on app_users(company_id);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  client_name text,
  address text,
  latitude numeric,
  longitude numeric,
  radius numeric default 100,
  status text default 'active',
  created_at timestamptz default now()
);
create index if not exists idx_projects_company on projects(company_id);

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text,
  status text default 'todo',
  priority text default 'normal',
  created_at timestamptz default now()
);
create index if not exists idx_project_tasks_project on project_tasks(project_id);

create table if not exists project_tools (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text,
  brought boolean default false
);
create index if not exists idx_project_tools_project on project_tools(project_id);

create table if not exists project_assignments (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references app_users(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists punches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  employee_id uuid references app_users(id) on delete set null,
  employee_name text,
  project_id uuid references projects(id) on delete set null,
  project_name text,
  pay_mode text,
  rate numeric,
  start_time timestamptz,
  end_time timestamptz,
  paused_at timestamptz,
  total_pause_minutes numeric default 0,
  within_geofence boolean default true,
  attempted_outside_geofence boolean default false,
  outside_details text,
  revenue numeric default 0,
  total_worked_hours numeric,
  surface_materials jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_punches_company on punches(company_id);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  contact_name text,
  phone text,
  email text,
  notes text
);
create index if not exists idx_suppliers_company on suppliers(company_id);

create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  emoji text,
  price_per_sqft numeric,
  supplier_price numeric,
  client_price numeric,
  supplier_id uuid references suppliers(id) on delete set null,
  unit text,
  unit_note text,
  image_url text,
  image_alt text
);
create index if not exists idx_catalog_items_company on catalog_items(company_id);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  quantity numeric default 0,
  unit text,
  emoji text,
  min_threshold numeric default 0
);
create index if not exists idx_inventory_items_company on inventory_items(company_id);

create table if not exists supplier_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  supplier_name text,
  date date,
  status text default 'ordered',
  total_amount numeric default 0
);
create index if not exists idx_supplier_orders_company on supplier_orders(company_id);

create table if not exists supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references supplier_orders(id) on delete cascade,
  name text,
  quantity numeric,
  price numeric
);
create index if not exists idx_supplier_order_items_order on supplier_order_items(order_id);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  company text,
  email text,
  phone text,
  address text
);
create index if not exists idx_clients_company on clients(company_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  kind text,
  document_number text,
  date date,
  due_date date,
  status text default 'draft',
  ref_quote text,
  ref_contract text,
  client_id uuid references clients(id) on delete set null,
  client_email text,
  client_phone text,
  client_address text,
  site_address text,
  is_simple_layout boolean default true,
  subtotal numeric default 0,
  discount_pct numeric default 0,
  tax_rate numeric default 0,
  tax_amount numeric default 0,
  total numeric default 0,
  holdback_pct numeric default 0,
  holdback_amount numeric default 0,
  deposit_amount numeric default 0,
  balance_due numeric default 0,
  accepted_payments jsonb,
  late_interest_pct numeric default 2,
  deposit_pct numeric default 25,
  payment_mid_pct numeric default 25,
  payment_final_pct numeric default 50,
  work_start_date date,
  work_end_date date,
  quote_valid_days numeric default 30,
  permit_by text default 'na',
  warranty_years numeric default 2,
  has_insurance boolean default false,
  subcontract_authorized boolean default false,
  subcontractor_name text,
  subcontractor_phone text,
  subcontractor_license text,
  contract_object text,
  clause_change_order text,
  clause_resiliation text,
  clause_warranty_details text,
  owner_name text,
  owner_signature text,
  client_signature text,
  signed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_documents_company on documents(company_id);

create table if not exists document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  line_type text not null, -- 'simple' | 'material' | 'labour' | 'other' | 'subcontract'
  description text,
  quantity numeric,
  unit text,
  unit_price numeric,
  total numeric,
  cladding_type text,
  brand text,
  thickness text,
  qty_sqft numeric,
  supplier text,
  task text,
  estimated_hours numeric,
  rate numeric,
  is_flat_rate boolean,
  amount numeric,
  company_name text,
  phone text,
  work_type text,
  sort_order integer default 0
);
create index if not exists idx_document_items_document on document_items(document_id);

create table if not exists document_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  date date,
  amount numeric,
  method text,
  notes text
);
create index if not exists idx_document_payments_document on document_payments(document_id);

-- payroll_entries : factures/relevés d'heures des employés (type Invoice côté app)
create table if not exists payroll_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  employee_name text,
  invoice_number text,
  date date,
  session_ids jsonb,
  hours numeric,
  amount numeric,
  gst_amount numeric,
  qst_amount numeric,
  total_with_taxes numeric,
  status text default 'draft',
  notes text,
  tax_included boolean default false,
  employee_signature text,
  employee_signed_at timestamptz
);
create index if not exists idx_payroll_entries_company on payroll_entries(company_id);

create table if not exists payroll_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  employee_id uuid references app_users(id) on delete set null,
  employee_name text,
  project_id uuid references projects(id) on delete set null,
  period text,
  amount numeric,
  status text default 'paid',
  date date,
  hours numeric
);
create index if not exists idx_payroll_payments_company on payroll_payments(company_id);

-- Table réservée pour un futur suivi de production détaillé (non utilisée par le
-- frontend actuellement, mais exposée par la couche /api/db générique).
create table if not exists production_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  employee_id uuid references app_users(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  date date,
  quantity numeric,
  unit text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_production_entries_company on production_entries(company_id);

create table if not exists weekly_goals (
  employee_id uuid primary key references app_users(id) on delete cascade,
  target_amount numeric default 0,
  current_amount numeric default 0,
  week_start date,
  xp_points integer default 0,
  level integer default 1,
  streak integer default 0,
  last_punch_date date
);

create table if not exists motivation_teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  member_ids jsonb,
  color text default '#f97316',
  active boolean default true,
  leader_id uuid references app_users(id) on delete set null,
  project_ids jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_motivation_teams_company on motivation_teams(company_id);

create table if not exists motivation_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text,
  scope text,
  metric text,
  target numeric default 0,
  current numeric default 0,
  start_date date,
  end_date date,
  team_id uuid references motivation_teams(id) on delete set null,
  employee_id uuid references app_users(id) on delete set null,
  reward_type text,
  reward_title text,
  reward_description text,
  status text default 'active'
);
create index if not exists idx_motivation_goals_company on motivation_goals(company_id);

create table if not exists hr_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text,
  title text,
  message text,
  date timestamptz,
  employee_id uuid references app_users(id) on delete set null,
  employee_name text,
  resolved boolean default false
);
create index if not exists idx_hr_alerts_company on hr_alerts(company_id);

-- expenses.category alimente la catégorisation automatique du scan de facture par photo
-- (voir /api/receipts/scan dans apiRoutes.ts).
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  provider text,
  category text check (category in ('materials', 'tools', 'fuel', 'rental', 'subcontractor', 'admin', 'other')),
  project_id uuid references projects(id) on delete set null,
  amount numeric default 0,
  tax numeric default 0,
  date date,
  notes text
);
create index if not exists idx_expenses_company on expenses(company_id);
