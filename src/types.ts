export type EmployeeRole = 'admin' | 'employee' | 'accountant' | 'secretary';

export type VisualTheme = 'quantum' | 'xp' | 'deco' | 'inferno' | 'arctic' | 'carbon';

export type PayMode = 'horaire' | 'surface' | 'forfait';

export interface Employee {
  id: string;
  name: string;
  nip: string; // 4-digit PIN
  role: EmployeeRole;
  hourlyRate: number;
  workerType: string; // ex: 'Compagnon', 'Salarié', 'Apprenti', etc.
  asNumber: string; // Numéro CCQ / AS
  phone: string;
  address: string;
  hireDate: string;
  avatar: string;
  level: number;
  xp: number;
  
  // Advanced fields
  workMode?: 'sqft' | 'hour' | 'flat';
  contractRenewalDate?: string;
  vacationRateOverride?: number;
  email?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  businessName?: string;
  gstNumber?: string;
  sin?: string;
  employeeProvince?: string;
  payFrequency?: 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';
  payPeriodStart?: string;
  annualSalary?: number;
}

export interface ProjectTask {
  id: string;
  text: string; // ex: "Refaire le revêtement côté gauche"
  done: boolean;
  priority: 'normal' | 'critique';
  createdAt: string;
}

export interface ProjectTool {
  id: string;
  name: string; // ex: "Cloueuse pneumatique"
  brought: boolean;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // default: 100 meters
  assignedEmployees: string[]; // Employee IDs
  status: 'active' | 'completed' | 'on-hold';
  tasks?: ProjectTask[]; // Liste de tâches à cocher pour ce chantier
  tools?: ProjectTool[]; // Outils à apporter sur le chantier
}

export interface SurfaceMaterialInput {
  name: string;
  quantity: number;
  unitPrice: number;
  emoji: string;
}

export interface PunchSession {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  payMode: PayMode;
  rate: number; // Hourly rate or forfait rate or base rate
  startTime: string; // ISO String
  endTime: string | null; // ISO String or null if active
  pausedAt: string | null; // ISO String of when pause started
  totalPauseMinutes: number;
  withinGeofence: boolean;
  attemptedOutsideGeofence?: boolean; // logged infractions
  outsideDetails?: string; // e.g., "At 345m"
  surfaceMaterials?: SurfaceMaterialInput[];
  revenue: number;
  totalWorkedHours?: number;
}

export interface Invoice {
  id: string;
  employeeId: string;
  employeeName: string;
  invoiceNumber: string;
  date: string;
  sessionIds: string[];
  totalHours: number;
  amount: number;
  gstAmount: number;
  qstAmount: number;
  totalWithTaxes: number;
  status: 'draft' | 'pending' | 'paid';
  notes?: string;
  taxIncluded: boolean;
  // Tactile signature required from the employee/sous-traitant before sending to the company
  employeeSignature?: string; // Base64 signature image data
  employeeSignedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type CatalogueUnit = 'pi2' | 'pi_lin' | 'boite' | 'rouleau' | 'unite' | 'lot';

export interface CatalogueMaterial {
  id: string;
  name: string;
  emoji: string;
  pricePerSqFt: number; // Prix payé au sous-traitant / unité (utilisé pour calculer la paie en mode Surface)
  supplierPrice?: number; // Coût payé au fournisseur / unité
  clientPrice?: number; // Prix chargé au client / unité
  supplierId?: string; // Référence vers Supplier.id
  unit?: CatalogueUnit; // Unité de vente : pi², pi linéaire, boîte, rouleau, unité, lot (défaut : pi2)
  unitNote?: string; // Précision libre, ex: "≈340 pièces/boîte"
  imageUrl?: string;
  imageAlt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  emoji: string;
  minThreshold: number;
}

export interface SupplierOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface SupplierOrder {
  id: string;
  supplierName: string;
  date: string;
  items: SupplierOrderItem[];
  status: 'ordered' | 'received' | 'pending';
  totalAmount: number;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string; // TPS
  qstNumber: string; // TVQ
  wcbNumber: string; // CNESST / WCB / Workers' Comp registration
  bnNumber: string; // NEQ / BN
  constructionLicenseNumber?: string; // ex: Permis RBQ (Québec) ou licence d'entrepreneur locale
  logo: string;
  interacEmail: string;
  bankDetails: {
    bank: string;
    transit: string;
    institution: string;
    account: string;
  };
  geofencingEnabled: boolean;
  vacationRate: number; // e.g. 4% or 6% or 8%
  legalMinimumWage: number; // minimum légal
  voiceReminderVolume: number; // 0-100
  voiceReminderSchedule: string; // hours e.g., "08:00, 12:00, 17:00"
  paymentTerms: string; // conditions de paiement

  // Conditions par défaut appliquées aux nouveaux devis/contrats/factures
  defaultLateInterestPct?: number;
  defaultWarrantyYears?: number;
  defaultClauseChangeOrder?: string;
  defaultClauseResiliation?: string;

  // Salaried Payroll Settings
  payrollVacationRate?: number;
  payrollHealthInsurance?: number;
  payrollDentalInsurance?: number;
  payrollLifeInsurance?: number;
  payrollLTD?: number;
  payrollRRSP?: number;
  payrollEAP?: number;
  payrollCustom1Name?: string;
  payrollCustom1Amount?: number;
  payrollCustom2Name?: string;
  payrollCustom2Amount?: number;
  
  // Onboarding metadata
  isOnboarded?: boolean;
  country?: 'CA' | 'US';
  region?: string;
  taxRate1?: number; // Federal tax rate e.g. 0.05
  taxRate2?: number; // Provincial/state tax rate e.g. 0.09975
  taxRate1Name?: string; // e.g. "GST" or "TPS"
  taxRate2Name?: string; // e.g. "PST" or "TVQ" or "State Tax"
  paymentDepositPct?: number;
  paymentMidPct?: number;
  paymentFinalPct?: number;

  // Assistant IA
  aiProvider?: 'gemini' | 'anthropic' | 'openai' | 'deepseek';
  aiApiKey?: string;
}

export interface WeeklyGoal {
  employeeId: string;
  targetAmount: number; // objectif $ de la semaine
  currentAmount: number; // revenus accumulés cette semaine
  weekStart: string; // reset automatique chaque lundi (YYYY-MM-DD)
  xpPoints: number; // XP cumulatifs depuis le début
  level: number; // calculé depuis xpPoints
  streak: number; // jours consécutifs avec punch in
  lastPunchDate: string | null;
}

export interface MotivationTeam {
  id: string;
  name: string;
  memberIds: string[];
  color: string;
  active: boolean;
  createdAt: string;
  leaderId?: string; // chef d'équipe (peut voir les stats de son équipe)
  projectIds?: string[]; // projets assignés à cette équipe
}

export interface MotivationGoal {
  id: string;
  title: string;
  scope: 'company' | 'team' | 'individual';
  metric: 'revenue' | 'hours' | 'jobs_completed' | 'checklist_done' | 'safety_days' | 'custom';
  target: number;
  current: number; // mis à jour manuellement ou auto
  startDate: string;
  endDate?: string;
  teamId?: string; // si scope = 'team'
  employeeId?: string; // si scope = 'individual'
  rewardType: 'lunch' | 'draw' | 'bonus' | 'gift' | 'trip' | 'custom';
  rewardTitle: string; // ex : "Dîner payé pour l'équipe"
  rewardDescription?: string;
  status: 'active' | 'paused' | 'achieved' | 'cancelled';
}

export interface HRAlert {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  message: string;
  date: string;
  employeeId?: string;
  employeeName?: string;
  resolved: boolean;
}

export interface GCPDocumentLineItem {
  id: string;
  description: string;
  qty: number;
  unit: string; // e.g., 'pi²', 'h', 'unité', 'forfait'
  unitPrice: number;
  total: number;
}

export interface GCPDocumentMaterialLine {
  id: string;
  claddingType: string; // ex: 'Fibre de ciment', 'Vinyle', 'Bois', 'Composite'
  brand: string; // ex: 'James Hardie', 'Gentek', 'LP SmartSide'
  thickness: string; // e.g., '1/2"', '7/16"'
  qtySqft: number;
  supplier: string;
  unitPrice: number; // $/pi²
  total: number;
}

export interface GCPDocumentLabourLine {
  id: string;
  task: string; // ex: 'Dépose', 'Préparation', 'Installation', 'Finitions', 'Nettoyage'
  estimatedHours: number;
  rate: number;
  isFlatRate: boolean;
  total: number;
}

export interface GCPDocumentOtherLine {
  id: string;
  description: string;
  amount: number;
}

export interface GCPDocumentSubcontractLine {
  id: string;
  companyName: string;
  phone: string;
  workType: string;
  amount: number;
}

export interface GCPDocumentPaymentHistoryEntry {
  id: string;
  date: string;
  amount: number;
  method: string; // ex: 'cheque', 'etransfer', 'virement', 'cash'
  notes?: string;
}

export interface GCPDocument {
  id: string;
  type: 'invoice' | 'quote' | 'contract';
  number: string; // Auto generated e.g., FAC-2026-0001
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid' | 'overdue';
  refQuote?: string;
  refContract?: string;

  // Client Details
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress?: string;

  // Document Lines (categorized or simple)
  isSimpleLayout: boolean;
  lineItems: GCPDocumentLineItem[];
  materialLines: GCPDocumentMaterialLine[];
  labourLines: GCPDocumentLabourLine[];
  otherLines: GCPDocumentOtherLine[];
  subcontractLines: GCPDocumentSubcontractLine[];

  // Financial Summary
  subtotal: number;
  discountPct: number; // percentage
  taxRate: number; // combined tax percentage
  taxAmount: number;
  total: number;
  holdbackPct: number; // Builders' Lien Act
  holdbackAmount: number;
  depositAmount: number; // deposit requested / received
  balanceDue: number; // total - holdback - partialPayments

  // Payment schedule & terms
  acceptedPayments: Array<'cheque' | 'etransfer' | 'virement' | 'cash'>;
  lateInterestPct: number; // default: 2
  depositPct: number; // default: 25
  paymentMidPct: number; // default: 25
  paymentFinalPct: number; // default: 50

  // Dates & Permits
  workStartDate?: string;
  workEndDate?: string;
  quoteValidDays: number; // default 30
  permitBy: 'client' | 'contractor' | 'na';

  // Warranty & Insurances
  warrantyYears: number; // default 2
  hasInsurance: boolean;
  subcontractAuthorized: boolean;
  subcontractorName?: string;
  subcontractorPhone?: string;
  subcontractorLicense?: string;

  // Legal Clauses for Contracts
  contractObject?: string;
  clauseChangeOrder?: string;
  clauseResiliation?: string;
  clauseWarrantyDetails?: string;

  // Electronic Signature
  clientSignature?: string; // Base64 signature image data
  ownerName: string;
  ownerSignature?: string;
  signedAt?: string;

  // Payment histories
  paymentsHistory: GCPDocumentPaymentHistoryEntry[];
}

export interface ExpenseRecord {
  id: string;
  provider: string; // fournisseur
  category: 'materials' | 'tools' | 'fuel' | 'rental' | 'subcontractor' | 'admin' | 'other';
  projectId: string; // project association
  amount: number;
  tax: number;
  date: string;
  notes?: string;
}

export interface PayrollPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId?: string; // optionnel: associer à un projet pour la marge brute
  period: string; // ex: "2026-06" ou "Semaine 23"
  amount: number;
  status: 'draft' | 'approved' | 'paid' | 'held' | 'refused';
  date: string;
  hours?: number;
}
