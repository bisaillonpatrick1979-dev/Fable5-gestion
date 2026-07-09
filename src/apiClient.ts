// Couche de synchronisation avec la base de données Supabase (voir server.ts /api/db,
// /api/hydrate, et db.ts). Conçue pour être résiliente : le store applicatif reste
// fonctionnel sur LocalStorage même si ces appels échouent (réseau absent, Supabase non
// configuré, etc.) — voir chaque action de store.ts, qui appelle ces fonctions en
// "best effort" (jamais bloquant, jamais fatal pour l'UI).
import type {
  Employee, Project, PunchSession, Invoice, Supplier, CatalogueMaterial, InventoryItem,
  SupplierOrder, Client, CompanyInfo, WeeklyGoal, MotivationTeam, MotivationGoal, HRAlert,
  GCPDocument, ExpenseRecord, PayrollPayment
} from './types';

// Génère un identifiant compatible avec les colonnes uuid de Supabase (les anciens
// identifiants "prefix-Date.now()" ne sont pas des UUID valides et feraient échouer
// tout insert distant).
export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cloudEnabled = false;
export function isCloudEnabled() { return cloudEnabled; }

let cachedCompanyId: string | null = null;
export function getCompanyId() { return cachedCompanyId; }

async function dbList(table: string): Promise<any[]> {
  const res = await fetch(`/api/db/${table}`);
  if (!res.ok) throw new Error(`GET ${table} → ${res.status}`);
  return res.json();
}

async function dbInsert(table: string, row: Record<string, any>): Promise<any> {
  const res = await fetch(`/api/db/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(`POST ${table} → ${res.status}`);
  return res.json();
}

async function dbUpsert(table: string, row: Record<string, any>): Promise<any> {
  const res = await fetch(`/api/db/${table}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(`PUT ${table} → ${res.status}`);
  return res.json();
}

async function dbUpdate(table: string, id: string, row: Record<string, any>): Promise<any> {
  const res = await fetch(`/api/db/${table}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(`PATCH ${table}/${id} → ${res.status}`);
  return res.json();
}

async function dbDelete(table: string, id: string): Promise<void> {
  const res = await fetch(`/api/db/${table}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${table}/${id} → ${res.status}`);
}

// "Best effort" : ne jamais laisser un échec réseau/Supabase casser l'interface.
function bestEffort(promise: Promise<any>, label: string) {
  promise.catch(err => console.warn(`[cloud-sync] ${label} a échoué (le mode local reste actif) :`, err.message));
}

// ---------------------------------------------------------------------------
// Mappers camelCase (app) <-> snake_case (base de données)
// ---------------------------------------------------------------------------

const workModeToPayMode: Record<string, string> = { hour: 'horaire', sqft: 'surface', flat: 'forfait' };
const payModeToWorkMode: Record<string, string> = { horaire: 'hour', surface: 'sqft', forfait: 'flat' };

export function employeeToRow(e: Employee, companyId?: string) {
  return {
    id: e.id, company_id: companyId, full_name: e.name, avatar_initials: e.name.slice(0, 2).toUpperCase(),
    role: e.role, access_code_hash: e.nip, pay_mode: workModeToPayMode[e.workMode || 'hour'] || 'horaire',
    pay_rate: e.hourlyRate, is_active: true, worker_type: e.workerType, as_number: e.asNumber,
    phone: e.phone, address: e.address, hire_date: e.hireDate || null, avatar: e.avatar,
    level: e.level, xp: e.xp, contract_renewal_date: e.contractRenewalDate || null,
    vacation_rate_override: e.vacationRateOverride, email: e.email, city: e.city, province: e.province,
    postal_code: e.postalCode, emergency_contact_name: e.emergencyContactName,
    emergency_contact_phone: e.emergencyContactPhone, emergency_contact_relation: e.emergencyContactRelation,
    business_name: e.businessName, gst_number: e.gstNumber, sin: e.sin, employee_province: e.employeeProvince,
    pay_frequency: e.payFrequency, pay_period_start: e.payPeriodStart || null, annual_salary: e.annualSalary
  };
}

export function rowToEmployee(r: any): Employee {
  return {
    id: r.id, name: r.full_name, nip: r.access_code_hash || '', role: r.role, hourlyRate: r.pay_rate || 0,
    workerType: r.worker_type || '', asNumber: r.as_number || '', phone: r.phone || '', address: r.address || '',
    hireDate: r.hire_date || '', avatar: r.avatar || '', level: r.level || 1, xp: r.xp || 0,
    workMode: payModeToWorkMode[r.pay_mode] as any, contractRenewalDate: r.contract_renewal_date || undefined,
    vacationRateOverride: r.vacation_rate_override ?? undefined, email: r.email || undefined, city: r.city || undefined,
    province: r.province || undefined, postalCode: r.postal_code || undefined,
    emergencyContactName: r.emergency_contact_name || undefined, emergencyContactPhone: r.emergency_contact_phone || undefined,
    emergencyContactRelation: r.emergency_contact_relation || undefined, businessName: r.business_name || undefined,
    gstNumber: r.gst_number || undefined, sin: r.sin || undefined, employeeProvince: r.employee_province || undefined,
    payFrequency: r.pay_frequency || undefined, payPeriodStart: r.pay_period_start || undefined,
    annualSalary: r.annual_salary ?? undefined
  };
}

export function projectToRow(p: Project, companyId?: string) {
  return {
    id: p.id, company_id: companyId, name: p.name, client_name: p.clientName, address: p.address,
    latitude: p.latitude, longitude: p.longitude, radius: p.radius, status: p.status
  };
}

export function rowToProject(r: any, tasks: any[], tools: any[], assignments: any[]): Project {
  return {
    id: r.id, name: r.name || '', clientName: r.client_name || '', address: r.address || '',
    latitude: r.latitude || 0, longitude: r.longitude || 0, radius: r.radius || 100,
    assignedEmployees: assignments.filter(a => a.project_id === r.id).map(a => a.user_id),
    status: r.status || 'active',
    tasks: tasks.filter(t => t.project_id === r.id).map(t => ({
      id: t.id, text: t.title || '', done: t.status === 'done', priority: t.priority || 'normal', createdAt: t.created_at || ''
    })),
    tools: tools.filter(t => t.project_id === r.id).map(t => ({ id: t.id, name: t.name || '', brought: !!t.brought }))
  };
}

export function projectTasksToRows(p: Project) {
  return (p.tasks || []).map(t => ({ id: t.id, project_id: p.id, title: t.text, status: t.done ? 'done' : 'todo', priority: t.priority }));
}
export function projectToolsToRows(p: Project) {
  return (p.tools || []).map(t => ({ id: t.id, project_id: p.id, name: t.name, brought: t.brought }));
}
export function projectAssignmentsToRows(p: Project) {
  return p.assignedEmployees.map(empId => ({ project_id: p.id, user_id: empId }));
}

// Remplace toutes les tâches/outils/assignations distants d'un chantier par son état
// courant (même stratégie "delete puis reinsert" que syncDocumentLines : ces
// sous-listes n'ont pas d'identité stable côté UI, un diff fin serait fragile).
export async function syncProjectChildren(project: Project) {
  try {
    const [existingTasks, existingTools, existingAssignments] = await Promise.all([
      dbList('project_tasks'), dbList('project_tools'), dbList('project_assignments')
    ]);
    const staleTasks = existingTasks.filter((r: any) => r.project_id === project.id);
    const staleTools = existingTools.filter((r: any) => r.project_id === project.id);
    const staleAssignments = existingAssignments.filter((r: any) => r.project_id === project.id);
    await Promise.all([
      ...staleTasks.map((r: any) => dbDelete('project_tasks', r.id)),
      ...staleTools.map((r: any) => dbDelete('project_tools', r.id)),
      ...staleAssignments.map((r: any) => dbDelete('project_assignments', r.id))
    ]);
    await Promise.all([
      ...projectTasksToRows(project).map(r => dbInsert('project_tasks', r)),
      ...projectToolsToRows(project).map(r => dbInsert('project_tools', r)),
      ...projectAssignmentsToRows(project).map(r => dbInsert('project_assignments', r))
    ]);
  } catch (err: any) {
    console.warn('[cloud-sync] syncProjectChildren a échoué :', err.message);
  }
}

// Insère d'abord le chantier (contrainte de clé étrangère des tables enfants),
// puis synchronise tâches/outils/assignations — ne doivent pas partir en parallèle.
export async function syncProjectInsert(project: Project) {
  try {
    await dbInsert('projects', projectToRow(project));
    await syncProjectChildren(project);
  } catch (err: any) {
    console.warn('[cloud-sync] syncProjectInsert a échoué :', err.message);
  }
}

// Supprime les enfants distants d'un chantier avant sa suppression, en défense
// contre l'absence éventuelle de ON DELETE CASCADE sur project_tasks/project_assignments.
export async function syncDeleteProjectChildren(projectId: string) {
  try {
    const [existingTasks, existingTools, existingAssignments] = await Promise.all([
      dbList('project_tasks'), dbList('project_tools'), dbList('project_assignments')
    ]);
    await Promise.all([
      ...existingTasks.filter((r: any) => r.project_id === projectId).map((r: any) => dbDelete('project_tasks', r.id)),
      ...existingTools.filter((r: any) => r.project_id === projectId).map((r: any) => dbDelete('project_tools', r.id)),
      ...existingAssignments.filter((r: any) => r.project_id === projectId).map((r: any) => dbDelete('project_assignments', r.id))
    ]);
  } catch (err: any) {
    console.warn('[cloud-sync] syncDeleteProjectChildren a échoué :', err.message);
  }
}

export function punchToRow(p: PunchSession, companyId?: string) {
  return {
    id: p.id, company_id: companyId, employee_id: p.employeeId, employee_name: p.employeeName,
    project_id: p.projectId, project_name: p.projectName, pay_mode: p.payMode, rate: p.rate,
    start_time: p.startTime, end_time: p.endTime, paused_at: p.pausedAt, total_pause_minutes: p.totalPauseMinutes,
    within_geofence: p.withinGeofence, attempted_outside_geofence: p.attemptedOutsideGeofence || false,
    outside_details: p.outsideDetails, revenue: p.revenue, total_worked_hours: p.totalWorkedHours,
    surface_materials: p.surfaceMaterials || null
  };
}

export function rowToPunch(r: any): PunchSession {
  return {
    id: r.id, employeeId: r.employee_id, employeeName: r.employee_name || '', projectId: r.project_id,
    projectName: r.project_name || '', payMode: r.pay_mode, rate: r.rate || 0, startTime: r.start_time,
    endTime: r.end_time, pausedAt: r.paused_at, totalPauseMinutes: r.total_pause_minutes || 0,
    withinGeofence: r.within_geofence ?? true, attemptedOutsideGeofence: r.attempted_outside_geofence || false,
    outsideDetails: r.outside_details || undefined, surfaceMaterials: r.surface_materials || undefined,
    revenue: r.revenue || 0, totalWorkedHours: r.total_worked_hours ?? undefined
  };
}

export function invoiceToRow(i: Invoice, companyId?: string) {
  return {
    id: i.id, company_id: companyId, user_id: i.employeeId, employee_name: i.employeeName,
    invoice_number: i.invoiceNumber, date: i.date, session_ids: i.sessionIds, hours: i.totalHours,
    amount: i.amount, gst_amount: i.gstAmount, qst_amount: i.qstAmount, total_with_taxes: i.totalWithTaxes,
    status: i.status, notes: i.notes, tax_included: i.taxIncluded, employee_signature: i.employeeSignature,
    employee_signed_at: i.employeeSignedAt
  };
}

export function rowToInvoice(r: any): Invoice {
  return {
    id: r.id, employeeId: r.user_id, employeeName: r.employee_name || '', invoiceNumber: r.invoice_number || '',
    date: r.date || '', sessionIds: r.session_ids || [], totalHours: r.hours || 0, amount: r.amount || 0,
    gstAmount: r.gst_amount || 0, qstAmount: r.qst_amount || 0, totalWithTaxes: r.total_with_taxes || 0,
    status: r.status || 'draft', notes: r.notes || undefined, taxIncluded: r.tax_included || false,
    employeeSignature: r.employee_signature || undefined, employeeSignedAt: r.employee_signed_at || undefined
  };
}

export function supplierToRow(s: Supplier, companyId?: string) {
  return { id: s.id, company_id: companyId, name: s.name, contact_name: s.contactName, phone: s.phone, email: s.email, notes: s.notes };
}
export function rowToSupplier(r: any): Supplier {
  return { id: r.id, name: r.name || '', contactName: r.contact_name || undefined, phone: r.phone || undefined, email: r.email || undefined, notes: r.notes || undefined };
}

export function catalogueToRow(c: CatalogueMaterial, companyId?: string) {
  return {
    id: c.id, company_id: companyId, name: c.name, emoji: c.emoji, price_per_sqft: c.pricePerSqFt,
    supplier_price: c.supplierPrice, client_price: c.clientPrice, supplier_id: c.supplierId || null,
    unit: c.unit, unit_note: c.unitNote, image_url: c.imageUrl, image_alt: c.imageAlt
  };
}
export function rowToCatalogue(r: any): CatalogueMaterial {
  return {
    id: r.id, name: r.name || '', emoji: r.emoji || '📦', pricePerSqFt: r.price_per_sqft || 0,
    supplierPrice: r.supplier_price ?? undefined, clientPrice: r.client_price ?? undefined,
    supplierId: r.supplier_id || undefined, unit: r.unit || undefined, unitNote: r.unit_note || undefined,
    imageUrl: r.image_url || undefined, imageAlt: r.image_alt || undefined
  };
}

export function inventoryToRow(i: InventoryItem, companyId?: string) {
  return { id: i.id, company_id: companyId, name: i.name, quantity: i.quantity, unit: i.unit, emoji: i.emoji, min_threshold: i.minThreshold };
}
export function rowToInventory(r: any): InventoryItem {
  return { id: r.id, name: r.name || '', quantity: r.quantity || 0, unit: r.unit || '', emoji: r.emoji || '📦', minThreshold: r.min_threshold || 0 };
}

export function supplierOrderToRow(o: SupplierOrder, companyId?: string) {
  return { id: o.id, company_id: companyId, supplier_name: o.supplierName, date: o.date, status: o.status, total_amount: o.totalAmount };
}
export function rowToSupplierOrder(r: any, items: any[]): SupplierOrder {
  return {
    id: r.id, supplierName: r.supplier_name || '', date: r.date || '', status: r.status || 'ordered',
    totalAmount: r.total_amount || 0,
    items: items.filter(it => it.order_id === r.id).map(it => ({ name: it.name || '', quantity: it.quantity || 0, price: it.price || 0 }))
  };
}
export function orderItemsToRows(o: SupplierOrder) {
  return o.items.map(it => ({ order_id: o.id, name: it.name, quantity: it.quantity, price: it.price }));
}

export async function syncOrderItems(order: SupplierOrder) {
  try {
    const existing = await dbList('supplier_order_items');
    const stale = existing.filter((r: any) => r.order_id === order.id);
    await Promise.all(stale.map((r: any) => dbDelete('supplier_order_items', r.id)));
    const rows = orderItemsToRows(order);
    await Promise.all(rows.map(r => dbInsert('supplier_order_items', r)));
  } catch (err: any) {
    console.warn('[cloud-sync] syncOrderItems a échoué :', err.message);
  }
}

export function clientToRow(c: Client, companyId?: string) {
  return { id: c.id, company_id: companyId, name: c.name, company: c.company, email: c.email, phone: c.phone, address: c.address };
}
export function rowToClient(r: any): Client {
  return { id: r.id, name: r.name || '', company: r.company || undefined, email: r.email || '', phone: r.phone || '', address: r.address || '' };
}

export function companyInfoToRow(c: CompanyInfo) {
  return {
    name: c.name, address: c.address, phone: c.phone, email: c.email, gst_number: c.gstNumber,
    qst_number: c.qstNumber, wcb_number: c.wcbNumber, bn_number: c.bnNumber,
    construction_license_number: c.constructionLicenseNumber, logo: c.logo, interac_email: c.interacEmail,
    bank_name: c.bankDetails?.bank, bank_transit: c.bankDetails?.transit, bank_institution: c.bankDetails?.institution,
    bank_account: c.bankDetails?.account, geofencing_enabled: c.geofencingEnabled, vacation_rate: c.vacationRate,
    legal_minimum_wage: c.legalMinimumWage, voice_reminder_volume: c.voiceReminderVolume,
    voice_reminder_schedule: c.voiceReminderSchedule, payment_terms: c.paymentTerms,
    default_late_interest_pct: c.defaultLateInterestPct, default_warranty_years: c.defaultWarrantyYears,
    default_clause_change_order: c.defaultClauseChangeOrder, default_clause_resiliation: c.defaultClauseResiliation,
    payroll_vacation_rate: c.payrollVacationRate, payroll_health_insurance: c.payrollHealthInsurance,
    payroll_dental_insurance: c.payrollDentalInsurance, payroll_life_insurance: c.payrollLifeInsurance,
    payroll_ltd: c.payrollLTD, payroll_rrsp: c.payrollRRSP, payroll_eap: c.payrollEAP,
    payroll_custom1_name: c.payrollCustom1Name, payroll_custom1_amount: c.payrollCustom1Amount,
    payroll_custom2_name: c.payrollCustom2Name, payroll_custom2_amount: c.payrollCustom2Amount,
    is_onboarded: c.isOnboarded, country: c.country, region: c.region, tax_rate1: c.taxRate1, tax_rate2: c.taxRate2,
    tax_rate1_name: c.taxRate1Name, tax_rate2_name: c.taxRate2Name, payment_deposit_pct: c.paymentDepositPct,
    payment_mid_pct: c.paymentMidPct, payment_final_pct: c.paymentFinalPct, ai_provider: c.aiProvider, ai_api_key: c.aiApiKey
  };
}

export function rowToCompanyInfo(r: any): Partial<CompanyInfo> {
  return {
    name: r.name || undefined, address: r.address || undefined, phone: r.phone || undefined, email: r.email || undefined,
    gstNumber: r.gst_number || undefined, qstNumber: r.qst_number || undefined, wcbNumber: r.wcb_number || undefined,
    bnNumber: r.bn_number || undefined, constructionLicenseNumber: r.construction_license_number || undefined,
    logo: r.logo || undefined, interacEmail: r.interac_email || undefined,
    bankDetails: { bank: r.bank_name || '', transit: r.bank_transit || '', institution: r.bank_institution || '', account: r.bank_account || '' },
    geofencingEnabled: r.geofencing_enabled ?? undefined, vacationRate: r.vacation_rate ?? undefined,
    legalMinimumWage: r.legal_minimum_wage ?? undefined, voiceReminderVolume: r.voice_reminder_volume ?? undefined,
    voiceReminderSchedule: r.voice_reminder_schedule || undefined, paymentTerms: r.payment_terms || undefined,
    defaultLateInterestPct: r.default_late_interest_pct ?? undefined, defaultWarrantyYears: r.default_warranty_years ?? undefined,
    defaultClauseChangeOrder: r.default_clause_change_order || undefined, defaultClauseResiliation: r.default_clause_resiliation || undefined,
    payrollVacationRate: r.payroll_vacation_rate ?? undefined, payrollHealthInsurance: r.payroll_health_insurance ?? undefined,
    payrollDentalInsurance: r.payroll_dental_insurance ?? undefined, payrollLifeInsurance: r.payroll_life_insurance ?? undefined,
    payrollLTD: r.payroll_ltd ?? undefined, payrollRRSP: r.payroll_rrsp ?? undefined, payrollEAP: r.payroll_eap ?? undefined,
    payrollCustom1Name: r.payroll_custom1_name || undefined, payrollCustom1Amount: r.payroll_custom1_amount ?? undefined,
    payrollCustom2Name: r.payroll_custom2_name || undefined, payrollCustom2Amount: r.payroll_custom2_amount ?? undefined,
    isOnboarded: r.is_onboarded ?? undefined, country: r.country || undefined, region: r.region || undefined,
    taxRate1: r.tax_rate1 ?? undefined, taxRate2: r.tax_rate2 ?? undefined, taxRate1Name: r.tax_rate1_name || undefined,
    taxRate2Name: r.tax_rate2_name || undefined, paymentDepositPct: r.payment_deposit_pct ?? undefined,
    paymentMidPct: r.payment_mid_pct ?? undefined, paymentFinalPct: r.payment_final_pct ?? undefined,
    aiProvider: r.ai_provider || undefined, aiApiKey: r.ai_api_key || undefined
  };
}

export function weeklyGoalToRow(w: WeeklyGoal) {
  return {
    employee_id: w.employeeId, target_amount: w.targetAmount, current_amount: w.currentAmount,
    week_start: w.weekStart, xp_points: w.xpPoints, level: w.level, streak: w.streak, last_punch_date: w.lastPunchDate
  };
}
export function rowToWeeklyGoal(r: any): WeeklyGoal {
  return {
    employeeId: r.employee_id, targetAmount: r.target_amount || 0, currentAmount: r.current_amount || 0,
    weekStart: r.week_start || '', xpPoints: r.xp_points || 0, level: r.level || 1, streak: r.streak || 0,
    lastPunchDate: r.last_punch_date || null
  };
}

export function motivationTeamToRow(t: MotivationTeam, companyId?: string) {
  return {
    id: t.id, company_id: companyId, name: t.name, member_ids: t.memberIds, color: t.color,
    active: t.active, leader_id: t.leaderId || null, project_ids: t.projectIds || null
  };
}
export function rowToMotivationTeam(r: any): MotivationTeam {
  return {
    id: r.id, name: r.name || '', memberIds: r.member_ids || [], color: r.color || '#f97316',
    active: r.active ?? true, createdAt: r.created_at || '', leaderId: r.leader_id || undefined,
    projectIds: r.project_ids || undefined
  };
}

export function motivationGoalToRow(g: MotivationGoal, companyId?: string) {
  return {
    id: g.id, company_id: companyId, title: g.title, scope: g.scope, metric: g.metric, target: g.target,
    current: g.current, start_date: g.startDate, end_date: g.endDate || null, team_id: g.teamId || null,
    employee_id: g.employeeId || null, reward_type: g.rewardType, reward_title: g.rewardTitle,
    reward_description: g.rewardDescription, status: g.status
  };
}
export function rowToMotivationGoal(r: any): MotivationGoal {
  return {
    id: r.id, title: r.title || '', scope: r.scope, metric: r.metric, target: r.target || 0, current: r.current || 0,
    startDate: r.start_date || '', endDate: r.end_date || undefined, teamId: r.team_id || undefined,
    employeeId: r.employee_id || undefined, rewardType: r.reward_type, rewardTitle: r.reward_title || '',
    rewardDescription: r.reward_description || undefined, status: r.status || 'active'
  };
}

export function hrAlertToRow(a: HRAlert, companyId?: string) {
  return {
    id: a.id, company_id: companyId, type: a.type, title: a.title, message: a.message, date: a.date,
    employee_id: a.employeeId || null, employee_name: a.employeeName, resolved: a.resolved
  };
}
export function rowToHRAlert(r: any): HRAlert {
  return {
    id: r.id, type: r.type, title: r.title || '', message: r.message || '', date: r.date || '',
    employeeId: r.employee_id || undefined, employeeName: r.employee_name || undefined, resolved: r.resolved || false
  };
}

export function expenseToRow(e: ExpenseRecord, companyId?: string) {
  return {
    id: e.id, company_id: companyId, provider: e.provider, category: e.category, project_id: e.projectId || null,
    amount: e.amount, tax: e.tax, date: e.date, notes: e.notes
  };
}
export function rowToExpense(r: any): ExpenseRecord {
  return {
    id: r.id, provider: r.provider || '', category: r.category, projectId: r.project_id || '', amount: r.amount || 0,
    tax: r.tax || 0, date: r.date || '', notes: r.notes || undefined
  };
}

export function payrollPaymentToRow(p: PayrollPayment, companyId?: string) {
  return {
    id: p.id, company_id: companyId, employee_id: p.employeeId, employee_name: p.employeeName,
    project_id: p.projectId || null, period: p.period, amount: p.amount, status: p.status, date: p.date, hours: p.hours
  };
}
export function rowToPayrollPayment(r: any): PayrollPayment {
  return {
    id: r.id, employeeId: r.employee_id, employeeName: r.employee_name || '', projectId: r.project_id || undefined,
    period: r.period || '', amount: r.amount || 0, status: r.status || 'draft', date: r.date || '', hours: r.hours ?? undefined
  };
}

// GCPDocument: 5 tableaux de lignes fusionnés dans document_items via line_type
export function documentLinesToRows(doc: GCPDocument) {
  const rows: Record<string, any>[] = [];
  doc.lineItems.forEach((l, idx) => rows.push({
    id: l.id, document_id: doc.id, line_type: 'simple', description: l.description, quantity: l.qty,
    unit: l.unit, unit_price: l.unitPrice, total: l.total, sort_order: idx
  }));
  doc.materialLines.forEach((l, idx) => rows.push({
    id: l.id, document_id: doc.id, line_type: 'material', cladding_type: l.claddingType, brand: l.brand,
    thickness: l.thickness, qty_sqft: l.qtySqft, supplier: l.supplier, unit_price: l.unitPrice, total: l.total, sort_order: idx
  }));
  doc.labourLines.forEach((l, idx) => rows.push({
    id: l.id, document_id: doc.id, line_type: 'labour', task: l.task, estimated_hours: l.estimatedHours,
    rate: l.rate, is_flat_rate: l.isFlatRate, total: l.total, sort_order: idx
  }));
  doc.otherLines.forEach((l, idx) => rows.push({
    id: l.id, document_id: doc.id, line_type: 'other', description: l.description, amount: l.amount, sort_order: idx
  }));
  doc.subcontractLines.forEach((l, idx) => rows.push({
    id: l.id, document_id: doc.id, line_type: 'subcontract', company_name: l.companyName, phone: l.phone,
    work_type: l.workType, amount: l.amount, sort_order: idx
  }));
  return rows;
}

export function documentToRow(doc: GCPDocument, companyId?: string) {
  return {
    id: doc.id, company_id: companyId, kind: doc.type, document_number: doc.number, date: doc.date,
    due_date: doc.dueDate, status: doc.status, ref_quote: doc.refQuote, ref_contract: doc.refContract,
    client_id: doc.clientId, client_email: doc.clientEmail, client_phone: doc.clientPhone,
    client_address: doc.clientAddress, site_address: doc.siteAddress, is_simple_layout: doc.isSimpleLayout,
    subtotal: doc.subtotal, discount_pct: doc.discountPct, tax_rate: doc.taxRate, tax_amount: doc.taxAmount,
    total: doc.total, holdback_pct: doc.holdbackPct, holdback_amount: doc.holdbackAmount,
    deposit_amount: doc.depositAmount, balance_due: doc.balanceDue, accepted_payments: doc.acceptedPayments,
    late_interest_pct: doc.lateInterestPct, deposit_pct: doc.depositPct, payment_mid_pct: doc.paymentMidPct,
    payment_final_pct: doc.paymentFinalPct, work_start_date: doc.workStartDate || null, work_end_date: doc.workEndDate || null,
    quote_valid_days: doc.quoteValidDays, permit_by: doc.permitBy, warranty_years: doc.warrantyYears,
    has_insurance: doc.hasInsurance, subcontract_authorized: doc.subcontractAuthorized,
    subcontractor_name: doc.subcontractorName, subcontractor_phone: doc.subcontractorPhone,
    subcontractor_license: doc.subcontractorLicense, contract_object: doc.contractObject,
    clause_change_order: doc.clauseChangeOrder, clause_resiliation: doc.clauseResiliation,
    clause_warranty_details: doc.clauseWarrantyDetails, owner_name: doc.ownerName,
    owner_signature: doc.ownerSignature, client_signature: doc.clientSignature, signed_at: doc.signedAt
  };
}

export function rowToDocument(r: any, items: any[], payments: any[]): GCPDocument {
  const docItems = items.filter(it => it.document_id === r.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return {
    id: r.id, type: r.kind, number: r.document_number || '', date: r.date || '', dueDate: r.due_date || '',
    status: r.status || 'draft', refQuote: r.ref_quote || undefined, refContract: r.ref_contract || undefined,
    clientId: r.client_id || '', clientName: r.client_name || '', clientAddress: r.client_address || '',
    clientEmail: r.client_email || '', clientPhone: r.client_phone || '', siteAddress: r.site_address || undefined,
    isSimpleLayout: r.is_simple_layout ?? true,
    lineItems: docItems.filter(l => l.line_type === 'simple').map(l => ({
      id: l.id, description: l.description || '', qty: l.quantity || 0, unit: l.unit || '', unitPrice: l.unit_price || 0, total: l.total || 0
    })),
    materialLines: docItems.filter(l => l.line_type === 'material').map(l => ({
      id: l.id, claddingType: l.cladding_type || '', brand: l.brand || '', thickness: l.thickness || '',
      qtySqft: l.qty_sqft || 0, supplier: l.supplier || '', unitPrice: l.unit_price || 0, total: l.total || 0
    })),
    labourLines: docItems.filter(l => l.line_type === 'labour').map(l => ({
      id: l.id, task: l.task || '', estimatedHours: l.estimated_hours || 0, rate: l.rate || 0,
      isFlatRate: !!l.is_flat_rate, total: l.total || 0
    })),
    otherLines: docItems.filter(l => l.line_type === 'other').map(l => ({ id: l.id, description: l.description || '', amount: l.amount || 0 })),
    subcontractLines: docItems.filter(l => l.line_type === 'subcontract').map(l => ({
      id: l.id, companyName: l.company_name || '', phone: l.phone || '', workType: l.work_type || '', amount: l.amount || 0
    })),
    subtotal: r.subtotal || 0, discountPct: r.discount_pct || 0, taxRate: r.tax_rate || 0, taxAmount: r.tax_amount || 0,
    total: r.total || 0, holdbackPct: r.holdback_pct || 0, holdbackAmount: r.holdback_amount || 0,
    depositAmount: r.deposit_amount || 0, balanceDue: r.balance_due || 0, acceptedPayments: r.accepted_payments || [],
    lateInterestPct: r.late_interest_pct ?? 2, depositPct: r.deposit_pct ?? 25, paymentMidPct: r.payment_mid_pct ?? 25,
    paymentFinalPct: r.payment_final_pct ?? 50, workStartDate: r.work_start_date || undefined, workEndDate: r.work_end_date || undefined,
    quoteValidDays: r.quote_valid_days ?? 30, permitBy: r.permit_by || 'na', warrantyYears: r.warranty_years ?? 2,
    hasInsurance: !!r.has_insurance, subcontractAuthorized: !!r.subcontract_authorized,
    subcontractorName: r.subcontractor_name || undefined, subcontractorPhone: r.subcontractor_phone || undefined,
    subcontractorLicense: r.subcontractor_license || undefined, contractObject: r.contract_object || undefined,
    clauseChangeOrder: r.clause_change_order || undefined, clauseResiliation: r.clause_resiliation || undefined,
    clauseWarrantyDetails: r.clause_warranty_details || undefined, clientSignature: r.client_signature || undefined,
    ownerName: r.owner_name || '', ownerSignature: r.owner_signature || undefined, signedAt: r.signed_at || undefined,
    paymentsHistory: payments.filter(p => p.document_id === r.id).map(p => ({
      id: p.id, date: p.date || '', amount: p.amount || 0, method: p.method || '', notes: p.notes || undefined
    }))
  };
}

export function documentPaymentToRow(p: any, documentId: string) {
  return { id: p.id, document_id: documentId, date: p.date, amount: p.amount, method: p.method, notes: p.notes };
}

// ---------------------------------------------------------------------------
// Fonctions de synchronisation "best effort" utilisées par store.ts
// ---------------------------------------------------------------------------

export function syncInsert(table: string, row: Record<string, any>) { bestEffort(dbInsert(table, row), `insert ${table}`); }
export function syncUpsert(table: string, row: Record<string, any>) { bestEffort(dbUpsert(table, row), `upsert ${table}`); }
export function syncUpdate(table: string, id: string, row: Record<string, any>) { bestEffort(dbUpdate(table, id, row), `update ${table}/${id}`); }
export function syncDelete(table: string, id: string) { bestEffort(dbDelete(table, id), `delete ${table}/${id}`); }

// Insère d'abord la ligne "documents" (contrainte de clé étrangère de document_items),
// puis synchronise ses lignes — les deux appels best-effort ne doivent pas partir en parallèle.
export async function syncDocumentInsert(doc: GCPDocument) {
  try {
    await dbInsert('documents', documentToRow(doc));
    await syncDocumentLines(doc);
  } catch (err: any) {
    console.warn('[cloud-sync] syncDocumentInsert a échoué (le mode local reste actif) :', err.message);
  }
}

export async function syncDocumentLines(doc: GCPDocument) {
  // Remplace toutes les lignes existantes du document par l'état courant (plus simple et
  // plus sûr qu'un diff fin, car les lignes n'ont pas d'identité stable côté UI).
  try {
    const existing = await dbList('document_items');
    const stale = existing.filter((r: any) => r.document_id === doc.id);
    await Promise.all(stale.map((r: any) => dbDelete('document_items', r.id)));
    const rows = documentLinesToRows(doc);
    await Promise.all(rows.map(r => dbInsert('document_items', r)));
  } catch (err: any) {
    console.warn('[cloud-sync] syncDocumentLines a échoué :', err.message);
  }
}

export interface CloudHydrateResult {
  enabled: boolean;
  companyId?: string;
  tables: Record<string, any[]>;
}

export async function hydrateFromCloud(): Promise<CloudHydrateResult> {
  try {
    const res = await fetch('/api/hydrate');
    if (!res.ok) throw new Error(`hydrate → ${res.status}`);
    const data = await res.json();
    cloudEnabled = !!data.enabled;
    if (!cloudEnabled) return { enabled: false, tables: {} };
    cachedCompanyId = data.companyId || null;
    return { enabled: true, companyId: data.companyId, tables: data };
  } catch (err: any) {
    console.warn('[cloud-sync] hydrateFromCloud a échoué, mode local (LocalStorage) actif :', err.message);
    cloudEnabled = false;
    return { enabled: false, tables: {} };
  }
}
