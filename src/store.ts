import { create } from 'zustand';
import {
  Employee, Project, PunchSession, Invoice, CatalogueMaterial,
  InventoryItem, SupplierOrder, Supplier, Client, CompanyInfo, HRAlert, EmployeeRole, PayMode, VisualTheme,
  WeeklyGoal, MotivationTeam, MotivationGoal,
  GCPDocument, GCPDocumentLineItem, GCPDocumentMaterialLine, GCPDocumentLabourLine, GCPDocumentOtherLine, GCPDocumentSubcontractLine, GCPDocumentPaymentHistoryEntry,
  ExpenseRecord, PayrollPayment
} from './types';
import {
  genId, syncInsert, syncUpsert, syncUpdate, syncDelete, syncDocumentLines, syncDocumentInsert, syncOrderItems, hydrateFromCloud, getCompanyId,
  syncProjectInsert, syncProjectChildren, syncDeleteProjectChildren,
  employeeToRow, projectToRow, punchToRow, invoiceToRow, supplierToRow, catalogueToRow, inventoryToRow,
  supplierOrderToRow, clientToRow, companyInfoToRow, weeklyGoalToRow, motivationTeamToRow, motivationGoalToRow,
  hrAlertToRow, expenseToRow, payrollPaymentToRow, documentToRow, documentPaymentToRow,
  rowToEmployee, rowToProject, rowToPunch, rowToInvoice, rowToSupplier, rowToCatalogue, rowToInventory,
  rowToSupplierOrder, rowToClient, rowToCompanyInfo, rowToWeeklyGoal, rowToMotivationTeam, rowToMotivationGoal,
  rowToHRAlert, rowToExpense, rowToPayrollPayment, rowToDocument
} from './apiClient';

interface AppState {
  // Data State
  employees: Employee[];
  projects: Project[];
  punchSessions: PunchSession[];
  invoices: Invoice[];
  catalogue: CatalogueMaterial[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  orders: SupplierOrder[];
  clients: Client[];
  companyInfo: CompanyInfo;
  hrAlerts: HRAlert[];
  documents: GCPDocument[];
  expenses: ExpenseRecord[];
  payrollPayments: PayrollPayment[];
  
  // Motivation & Teams State
  motivationTeams: MotivationTeam[];
  motivationGoals: MotivationGoal[];
  weeklyGoals: WeeklyGoal[];
  
  // App Config / Session State
  activeEmployee: Employee | null;
  currentLanguage: 'FR' | 'EN';
  currentTheme: VisualTheme;
  offlineSyncStatus: 'synced' | 'offline' | 'pending';
  isOnboarded: boolean;
  
  // Operations / Actions
  setLanguage: (lang: 'FR' | 'EN') => void;
  setTheme: (theme: VisualTheme) => void;
  login: (nip: string, employeeId: string) => { success: boolean; message: string };
  logout: () => void;
  setIsOnboarded: (val: boolean) => void;
  
  // Employee CRUD
  addEmployee: (emp: Omit<Employee, 'id' | 'level' | 'xp'>) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  addXP: (employeeId: string, amount: number) => void;
  
  // Teams Action
  addMotivationTeam: (team: Omit<MotivationTeam, 'id' | 'createdAt'>) => void;
  updateMotivationTeam: (team: MotivationTeam) => void;
  deleteMotivationTeam: (id: string) => void;

  // Motivation Goals Action
  addMotivationGoal: (goal: Omit<MotivationGoal, 'id' | 'startDate'>) => void;
  updateMotivationGoal: (goal: MotivationGoal) => void;
  deleteMotivationGoal: (id: string) => void;
  manualProgressGoal: (goalId: string, increment: number) => void;
  recomputeGoalsAndStreaks: () => void;
  
  // Project CRUD
  addProject: (proj: Omit<Project, 'id'>) => void;
  updateProject: (proj: Project) => void;
  deleteProject: (id: string) => void;

  // Catalogue CRUD
  addCatalogueMaterial: (item: Omit<CatalogueMaterial, 'id'>) => void;
  updateCatalogueMaterial: (item: CatalogueMaterial) => void;
  deleteCatalogueMaterial: (id: string) => void;

  // Supplier CRUD
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;

  // Inventory CRUD
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;

  // Orders CRUD
  addSupplierOrder: (order: Omit<SupplierOrder, 'id'>) => void;
  updateSupplierOrder: (order: SupplierOrder) => void;

  // Client CRUD
  addClient: (cli: Omit<Client, 'id'>) => void;
  updateClient: (cli: Client) => void;
  deleteClient: (id: string) => void;

  // Company Info Update
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void;

  // HR Alerts
  addHRAlert: (alert: Omit<HRAlert, 'id' | 'date' | 'resolved'>) => void;
  resolveHRAlert: (id: string) => void;

  // Punch Sessions Actions
  startPunchSession: (params: {
    employeeId: string;
    projectId: string;
    payMode: PayMode;
    rate: number;
    withinGeofence: boolean;
    attemptedOutsideGeofence?: boolean;
    outsideDetails?: string;
  }) => void;
  pausePunchSession: (id: string) => void;
  resumePunchSession: (id: string) => void;
  stopPunchSession: (id: string, surfaceMaterials?: { name: string; quantity: number; unitPrice: number; emoji: string }[]) => void;

  // Invoice CRUD
  addInvoice: (inv: Omit<Invoice, 'id' | 'invoiceNumber'>) => void;
  updateInvoice: (inv: Invoice) => void;
  generateDraftInvoiceForEmployee: (employeeId: string) => void;

  // System A: Client Documents Actions
  addGCPDocument: (doc: Omit<GCPDocument, 'id' | 'number'>) => void;
  updateGCPDocument: (doc: GCPDocument) => void;
  deleteGCPDocument: (id: string) => void;
  convertQuoteToInvoice: (quoteId: string) => void;
  addPartialPayment: (id: string, amount: number, method: string, notes?: string) => void;

  // Accounting CRUD
  addExpense: (exp: Omit<ExpenseRecord, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addPayrollPayment: (pay: Omit<PayrollPayment, 'id'>) => void;
  deletePayrollPayment: (id: string) => void;

  // Synchronisation cloud (Supabase) : hydrate le store depuis la base de données si configurée
  hydrateCloud: () => Promise<void>;
}

// Initial Mock Data to bootstrap the application beautifully
const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Patrick Bisaillon',
    nip: '0000',
    role: 'admin',
    hourlyRate: 45.0,
    workerType: 'Compagnon',
    asNumber: 'AS-88726-QC',
    phone: '514-555-0199',
    address: '1240 Rue de l\'Église, Montréal, QC',
    hireDate: '2020-03-12',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
    level: 5,
    xp: 2450
  },
  {
    id: 'emp-2',
    name: 'Mathieu Côté',
    nip: '1234',
    role: 'employee',
    hourlyRate: 28.5,
    workerType: 'Apprenti 2',
    asNumber: 'AS-22910-QC',
    phone: '450-555-0144',
    address: '344 Rue Saint-Jude, Longueuil, QC',
    hireDate: '2023-05-15',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
    level: 2,
    xp: 680
  },
  {
    id: 'emp-3',
    name: 'Stéphane Roy',
    nip: '5678',
    role: 'employee',
    hourlyRate: 38.0,
    workerType: 'Compagnon Poseur',
    asNumber: 'AS-66512-QC',
    phone: '514-555-0211',
    address: '789 Rue Sherbrooke Est, Montréal, QC',
    hireDate: '2021-09-01',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    level: 4,
    xp: 1850
  },
  {
    id: 'emp-4',
    name: 'Jessica Tremblay',
    nip: '1111',
    role: 'secretary',
    hourlyRate: 25.0,
    workerType: 'Secrétaire comptable',
    asNumber: 'AS-10294-QC',
    phone: '514-555-0182',
    address: '4521 Boul Rosemont, Montréal, QC',
    hireDate: '2022-11-20',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150',
    level: 3,
    xp: 1200
  }
];

const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Chantier Hydro-Québec',
    clientName: 'Hydro-Québec (Rénovations)',
    address: '75 Boul. René-Lévesque Ouest, Montréal, QC',
    latitude: 45.5088,
    longitude: -73.5540,
    radius: 100, // 100m
    assignedEmployees: ['emp-2', 'emp-3'],
    status: 'active'
  },
  {
    id: 'proj-2',
    name: 'Condos Concorde Brossard',
    clientName: 'Sogeprim Immobilier Inc.',
    address: '2300 Rue de la Concorde, Brossard, QC',
    latitude: 45.4418,
    longitude: -73.4429,
    radius: 150,
    assignedEmployees: ['emp-2', 'emp-3', 'emp-1'],
    status: 'active'
  },
  {
    id: 'proj-3',
    name: 'Siège Social (Bureaux)',
    clientName: 'Votre Entreprise Inc.',
    address: '1200 Rue Saint-Denis, Montréal, QC',
    latitude: 45.5145,
    longitude: -73.5601,
    radius: 50,
    assignedEmployees: ['emp-4', 'emp-1'],
    status: 'active'
  },
  {
    id: 'proj-4',
    name: 'Toiture Chalet Tremblant',
    clientName: 'Famille Larouche',
    address: '675 Chemin de la Forêt, Mont-Tremblant, QC',
    latitude: 46.1184,
    longitude: -74.5962,
    radius: 200,
    assignedEmployees: ['emp-3'],
    status: 'on-hold'
  }
];

const initialCatalogue: CatalogueMaterial[] = [
  { id: 'cat-1', name: 'Bardeau d\'asphalte (Standard)', emoji: '🪵', pricePerSqFt: 3.50, imageUrl: "https://images.unsplash.com/photo-1625756975-c71c4ff88df1?w=400&q=80", imageAlt: "Bardeaux d'asphalte gris sur toiture" },
  { id: 'cat-2', name: 'Membrane élastomère Havane', emoji: '🛢️', pricePerSqFt: 6.20, imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80", imageAlt: "Membrane sous-couche noire de toiture" },
  { id: 'cat-3', name: 'Revêtement d\'acier Rustique', emoji: '🧱', pricePerSqFt: 12.50, imageUrl: "https://images.unsplash.com/photo-1590725121839-892b458a74fe?w=400&q=80", imageAlt: "Panneau de siding en acier galvanisé" },
  { id: 'cat-4', name: 'Flashing en aluminium brossé', emoji: '📐', pricePerSqFt: 4.80, imageUrl: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=80", imageAlt: "Tôle de rive aluminium grise au bord de toit" },
  { id: 'cat-5', name: 'Soffites d\'aluminium ventilés', emoji: '🧇', pricePerSqFt: 3.90, imageUrl: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400&q=80", imageAlt: "Soffite en vinyle blanc ventilé sous les avant-toits" },
  { id: 'cat-6', name: 'Membrane pare-air Tyvek Roll', emoji: '💨', pricePerSqFt: 2.10, imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=80", imageAlt: "Rouleau de membrane pare-air blanche" }
];

const initialSuppliers: Supplier[] = [
  { id: 'sup-1', name: 'Distribution Pro-Toit Ltée', contactName: 'Marie-Claude Fournier', phone: '450-661-2200', email: 'ventes@protoit.ca' },
  { id: 'sup-2', name: 'Aciers Québec Inc.', contactName: 'Réjean Bouchard', phone: '514-388-4477', email: 'commandes@aciersquebec.ca' },
  { id: 'sup-3', name: 'Rona l\'Entrepôt', phone: '1-866-283-3846' }
];

const initialInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Bardeau d\'asphalte Stratifié Noir', quantity: 450, unit: 'paquets', emoji: '🪵', minThreshold: 100 },
  { id: 'inv-2', name: 'Clous de toiture HD 1-1/4"', quantity: 15, unit: 'boîtes', emoji: '螺', minThreshold: 5 },
  { id: 'inv-3', name: 'Rouleaux Membrane sous-couche 15lb', quantity: 3, unit: 'rouleaux', emoji: '🛢️', minThreshold: 10 }, // Warning trigger! (3 < 10)
  { id: 'inv-4', name: 'Flashing d\'aluminium Brun Terre', quantity: 45, unit: 'sections', emoji: '📐', minThreshold: 20 },
  { id: 'inv-5', name: 'Scellant de silicone Premium Gris', quantity: 8, unit: 'tubes', emoji: '🩹', minThreshold: 12 } // Warning trigger! (8 < 12)
];

const initialClients: Client[] = [
  { id: 'cli-1', name: 'Hydro-Québec (Rénovations)', company: 'Hydro-Québec', email: 'repartitions@hydro.qc.ca', phone: '514-879-1111', address: '75 Boul. René-Lévesque O, Montréal' },
  { id: 'cli-2', name: 'Sogeprim Immobilier Inc.', company: 'Sogeprim', email: 'compta@sogeprim.ca', phone: '450-444-2391', address: '500 Boul. Taschereau, Brossard' },
  { id: 'cli-3', name: 'Jean Larouche', company: 'Particulier', email: 'j.larouche@gmail.com', phone: '819-223-1029', address: '675 Chemin de la Forêt, Mont-Tremblant' }
];

const initialExpenses: ExpenseRecord[] = [
  { id: 'exp-1', provider: 'Rona l\'Entrepôt', category: 'materials', projectId: 'proj-1', amount: 1540.00, tax: 230.62, date: '2026-06-01', notes: 'Bois de charpente et clous' },
  { id: 'exp-2', provider: 'Petro-Canada', category: 'fuel', projectId: 'proj-1', amount: 120.00, tax: 17.97, date: '2026-06-03', notes: 'Carburant pickup Patrick' },
  { id: 'exp-3', provider: 'Hilti Canada', category: 'tools', projectId: 'proj-2', amount: 480.00, tax: 71.88, date: '2026-05-15', notes: 'Perceuse à percussion neuve' },
  { id: 'exp-4', provider: 'Sling-Choker Montréal', category: 'rental', projectId: 'proj-1', amount: 350.00, tax: 52.41, date: '2026-06-02', notes: 'Location harnais et monte-charge' }
];

const initialPayrollPayments: PayrollPayment[] = [
  { id: 'pay-1', employeeId: 'emp-2', employeeName: 'Mathieu Côté', period: '2026-06', amount: 2280.00, status: 'paid', date: '2026-06-01' },
  { id: 'pay-2', employeeId: 'emp-1', employeeName: 'Patrick Bisaillon', period: '2026-06', amount: 3600.00, status: 'approved', date: '2026-06-02' }
];

const initialCompanyInfo: CompanyInfo = {
  name: 'Votre Entreprise Inc.',
  address: '1200 Rue Saint-Denis, Montréal, QC, H2X 3J6',
  phone: '514-388-XTER',
  email: 'info@votreentreprise.ca',
  gstNumber: 'GST-102938475-RT0001',
  qstNumber: 'QST-1002938475-TQ0001',
  wcbNumber: 'WCB-CNESST-20394812',
  bnNumber: 'NEQ-1172938472',
  logo: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=150&h=150', // placeholder badge construction
  interacEmail: 'paiement@votreentreprise.ca',
  bankDetails: {
    bank: 'Banque Nationale du Canada',
    transit: '10293',
    institution: '006',
    account: '1234-567-890'
  },
  geofencingEnabled: true,
  vacationRate: 4, // 4% de paye de vacances légale
  legalMinimumWage: 15.75, // minimum québécois
  voiceReminderVolume: 80,
  voiceReminderSchedule: '08:00, 12:00, 17:00',
  paymentTerms: 'Paiement net 30 jours'
};

const initialHRAlerts: HRAlert[] = [
  {
    id: 'hr-1',
    type: 'warning',
    title: 'Inventaire critique',
    message: 'Le stock de "Rouleaux Membrane sous-couche 15lb" est de 3, sous le seuil minimum de 10.',
    date: '2026-06-03T10:00:00Z',
    resolved: false
  },
  {
    id: 'hr-2',
    type: 'danger',
    title: 'Certification professionnelle expirée',
    message: 'Le certificat de compétence de Stéphane Roy nécessite une mise à jour administrative (Expiré depuis 2 jours).',
    date: '2026-06-01T08:00:00Z',
    employeeId: 'emp-3',
    employeeName: 'Stéphane Roy',
    resolved: false
  },
  {
    id: 'hr-3',
    type: 'info',
    title: 'Régulation Heures Supplémentaires',
    message: 'Mathieu Côté a cumulé 38 heures de chantier cette semaine. Approche de la limite légale de 40h.',
    date: '2026-06-03T16:30:00Z',
    employeeId: 'emp-2',
    employeeName: 'Mathieu Côté',
    resolved: false
  }
];

// Seed historical punch sessions (e.g., Mathieu has worked a few sessions, Stéphane also)
const initialPunchSessions: PunchSession[] = [
  {
    id: 'punch-h1',
    employeeId: 'emp-2',
    employeeName: 'Mathieu Côté',
    projectId: 'proj-1',
    projectName: 'Chantier Hydro-Québec',
    payMode: 'horaire',
    rate: 28.5,
    startTime: '2026-06-01T08:00:00Z',
    endTime: '2026-06-01T16:30:00Z', // 8.5 hours total (with 30 mins unpaid pause)
    pausedAt: null,
    totalPauseMinutes: 30,
    withinGeofence: true,
    totalWorkedHours: 8.0,
    revenue: 228.00 // 8 hours paid * 28.5
  },
  {
    id: 'punch-h2',
    employeeId: 'emp-3',
    employeeName: 'Stéphane Roy',
    projectId: 'proj-2',
    projectName: 'Condos Concorde Brossard',
    payMode: 'surface',
    rate: 12.50, // rate per pi²
    startTime: '2026-06-01T07:30:00Z',
    endTime: '2026-06-01T17:00:00Z',
    pausedAt: null,
    totalPauseMinutes: 45,
    withinGeofence: true,
    surfaceMaterials: [
      { name: 'Revêtement d\'acier Rustique', quantity: 50, unitPrice: 12.50, emoji: '🧱' }
    ],
    totalWorkedHours: 8.75,
    revenue: 625.00 // 50 pi² * 12.50
  },
  {
    id: 'punch-h3',
    employeeId: 'emp-2',
    employeeName: 'Mathieu Côté',
    projectId: 'proj-2',
    projectName: 'Condos Concorde Brossard',
    payMode: 'horaire',
    rate: 28.5,
    startTime: '2026-06-02T08:00:00Z',
    endTime: '2026-06-02T17:00:00Z', // 9 hours, 45 mins pause
    pausedAt: null,
    totalPauseMinutes: 45,
    withinGeofence: true,
    totalWorkedHours: 8.25,
    revenue: 235.13 // 8.25 worked hours * 28.5 $
  },
  {
    id: 'punch-h4',
    employeeId: 'emp-3',
    employeeName: 'Stéphane Roy',
    projectId: 'proj-1',
    projectName: 'Chantier Hydro-Québec',
    payMode: 'forfait',
    rate: 450.0, // Forfait pour la journée
    startTime: '2026-06-02T07:00:00Z',
    endTime: '2026-06-02T16:00:00Z',
    pausedAt: null,
    totalPauseMinutes: 60,
    withinGeofence: true,
    totalWorkedHours: 8.0,
    revenue: 450.00
  }
];

const initialInvoices: Invoice[] = [
  {
    id: 'inv-h1',
    employeeId: 'emp-2',
    employeeName: 'Mathieu Côté',
    invoiceNumber: 'INV-2026-0001',
    date: '2026-06-02',
    sessionIds: ['punch-h1', 'punch-h3'],
    totalHours: 16.25,
    amount: 463.13,
    gstAmount: 23.16,
    qstAmount: 46.20,
    totalWithTaxes: 532.49,
    status: 'pending',
    taxIncluded: false,
    notes: 'Revenus accumulés pourHydro-Québec et Concorde Brossard.'
  },
  {
    id: 'inv-h2',
    employeeId: 'emp-3',
    employeeName: 'Stéphane Roy',
    invoiceNumber: 'INV-2026-0002',
    date: '2026-06-02',
    sessionIds: ['punch-h2', 'punch-h4'],
    totalHours: 18.5,
    amount: 1075.00,
    gstAmount: 53.75,
    qstAmount: 107.23,
    totalWithTaxes: 1235.98,
    status: 'paid',
    taxIncluded: false,
    notes: 'Paiement effectué par Virement Interac.'
  }
];

const initialDocuments: GCPDocument[] = [
  {
    id: 'doc-1',
    type: 'invoice',
    number: 'FAC-2026-0001',
    date: '2026-05-15',
    dueDate: '2026-06-15',
    status: 'paid',
    clientId: 'cli-1',
    clientName: 'Hydro-Québec (Rénovations)',
    clientAddress: '75 Boul. René-Lévesque Ouest, Montréal, QC',
    clientEmail: 'repartitions@hydro.qc.ca',
    clientPhone: '514-879-1111',
    siteAddress: 'Centrale d\'Iberville, QC',
    isSimpleLayout: true,
    lineItems: [
      { id: 'li-1', description: 'Pose revêtement façade nord', qty: 350, unit: 'pi²', unitPrice: 28.50, total: 9975 }
    ],
    materialLines: [],
    labourLines: [],
    otherLines: [],
    subcontractLines: [],
    subtotal: 9975,
    discountPct: 0,
    taxRate: 14.975,
    taxAmount: 1493.76,
    total: 11468.76,
    holdbackPct: 10,
    holdbackAmount: 1146.88,
    depositAmount: 2500,
    balanceDue: 0,
    acceptedPayments: ['virement', 'etransfer'],
    lateInterestPct: 2,
    depositPct: 25,
    paymentMidPct: 25,
    paymentFinalPct: 50,
    ownerName: 'Patrick Bisaillon',
    paymentsHistory: [
      { id: 'pay-1', date: '2026-05-15', amount: 2500, method: 'virement', notes: 'Acompte reçu de Hydro-Québec' },
      { id: 'pay-2', date: '2026-06-01', amount: 7821.88, method: 'virement', notes: 'Paiement final reçu, libération de retenue en cours' }
    ],
    quoteValidDays: 30,
    permitBy: 'na',
    warrantyYears: 2,
    hasInsurance: true,
    subcontractAuthorized: true
  },
  {
    id: 'doc-2',
    type: 'quote',
    number: 'DEV-2026-0001',
    date: '2026-06-01',
    dueDate: '2026-07-01',
    status: 'accepted',
    clientId: 'cli-3',
    clientName: 'Jean Larouche',
    clientAddress: '675 Chemin de la Forêt, Mont-Tremblant, QC',
    clientEmail: 'j.larouche@gmail.com',
    clientPhone: '819-223-1029',
    siteAddress: 'Chalet Tremblant, QC',
    isSimpleLayout: false,
    lineItems: [],
    materialLines: [
      { id: 'ml-1', claddingType: 'Revêtement d\'acier Rustique', brand: 'James Hardie', thickness: '1/2"', qtySqft: 850, supplier: 'Gentek', unitPrice: 12.50, total: 10625 }
    ],
    labourLines: [
      { id: 'lbl-1', task: 'Installation', estimatedHours: 45, rate: 45, isFlatRate: false, total: 2025 }
    ],
    otherLines: [
      { id: 'ol-1', description: 'Location nacelle', amount: 350 }
    ],
    subcontractLines: [],
    subtotal: 13000,
    discountPct: 5,
    taxRate: 14.975,
    taxAmount: 1849.41,
    total: 14199.41,
    holdbackPct: 0,
    holdbackAmount: 0,
    depositAmount: 3500,
    balanceDue: 14199.41,
    acceptedPayments: ['virement', 'cheque'],
    lateInterestPct: 2,
    depositPct: 25,
    paymentMidPct: 25,
    paymentFinalPct: 50,
    ownerName: 'Patrick Bisaillon',
    paymentsHistory: [],
    quoteValidDays: 30,
    permitBy: 'contractor',
    warrantyYears: 2,
    hasInsurance: true,
    subcontractAuthorized: true
  }
];

const initialOrders: SupplierOrder[] = [
  {
    id: 'ord-1',
    supplierName: 'Distribution Pro-Toit Ltée',
    date: '2026-06-01',
    items: [
      { name: 'Bardeau Stratifié Noir', quantity: 120, price: 28.00 },
      { name: 'Soffites d\'aluminium Blanc', quantity: 30, price: 15.50 }
    ],
    status: 'received',
    totalAmount: 3825.00
  },
  {
    id: 'ord-2',
    supplierName: 'Aciers Québec Inc.',
    date: '2026-06-03',
    items: [
      { name: 'Sections Acier Rustique', quantity: 80, price: 65.00 },
      { name: 'Vis industrielles toiture (boîtes)', quantity: 20, price: 18.00 }
    ],
    status: 'ordered',
    totalAmount: 5560.00
  }
];

const getStartOfWeekISO = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const initialMotivationTeams: MotivationTeam[] = [
  {
    id: 'team-1',
    name: 'Poseurs de Toiture Élite',
    memberIds: ['emp-1', 'emp-2'],
    color: '#06b6d4',
    active: true,
    createdAt: '2026-05-01T12:00:00Z',
    leaderId: 'emp-1',
    projectIds: ['proj-1']
  },
  {
    id: 'team-2',
    name: 'Gardiens Modernes du Revêtement',
    memberIds: ['emp-3', 'emp-4'],
    color: '#a855f7',
    active: true,
    createdAt: '2026-05-10T14:30:00Z',
    leaderId: 'emp-3',
    projectIds: ['proj-1']
  }
];

const initialMotivationGoals: MotivationGoal[] = [
  {
    id: 'goal-1',
    title: 'Chiffre d\'Affaires Global',
    scope: 'company',
    metric: 'revenue',
    target: 20000,
    current: 4890,
    startDate: '2026-06-01',
    rewardType: 'bonus',
    rewardTitle: 'Prime collective de 150$/employé',
    rewardDescription: 'Viser ensemble 20K$ de revenus de punch.',
    status: 'active'
  },
  {
    id: 'goal-2',
    title: 'Heures de Chantier Élite',
    scope: 'team',
    teamId: 'team-1',
    metric: 'hours',
    target: 80,
    current: 32,
    startDate: '2026-06-01',
    rewardType: 'lunch',
    rewardTitle: 'Dîner BBQ payé au complet',
    rewardDescription: 'L\'équipe de Mathieu et Patrick réalise 80 heures sur le chantier.',
    status: 'active'
  },
  {
    id: 'goal-3',
    title: 'Objectif Chantier Propre - Jessica',
    scope: 'individual',
    employeeId: 'emp-2',
    metric: 'jobs_completed',
    target: 6,
    current: 3,
    startDate: '2026-06-01',
    rewardType: 'gift',
    rewardTitle: 'Carte cadeau chantier de 50$',
    rewardDescription: 'Jessica atteint 6 fiches d\'intervention validées sur place.',
    status: 'active'
  }
];

const initialWeeklyGoals: WeeklyGoal[] = [
  { employeeId: 'emp-1', targetAmount: 2500, currentAmount: 1800, weekStart: getStartOfWeekISO(), xpPoints: 2450, level: 5, streak: 4, lastPunchDate: '2026-06-02' },
  { employeeId: 'emp-2', targetAmount: 1200, currentAmount: 680, weekStart: getStartOfWeekISO(), xpPoints: 680, level: 2, streak: 2, lastPunchDate: '2026-06-02' },
  { employeeId: 'emp-3', targetAmount: 1800, currentAmount: 1200, weekStart: getStartOfWeekISO(), xpPoints: 1850, level: 4, streak: 3, lastPunchDate: '2026-06-02' },
  { employeeId: 'emp-4', targetAmount: 1000, currentAmount: 400, weekStart: getStartOfWeekISO(), xpPoints: 1200, level: 3, streak: 1, lastPunchDate: '2026-06-02' }
];

// Helper to load state from localStorage or use defaults
// Prochain numéro séquentiel basé sur le plus grand numéro déjà émis parmi une
// liste de numéros existants (et non sur le nombre d'éléments restants), pour
// éviter des collisions après la suppression d'un document/d'une facture.
const nextSequentialNumber = (existingNumbers: string[], prefix: string): string => {
  const maxSeq = existingNumbers.reduce((max, num) => {
    const match = num.match(/-(\d+)$/);
    const seq = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, seq);
  }, 0);
  return `${prefix}-${new Date().getFullYear()}-${String(maxSeq + 1).padStart(4, '0')}`;
};

const getNextDocNumber = (documents: GCPDocument[], type: GCPDocument['type'], prefix: string): string =>
  nextSequentialNumber(documents.filter(d => d.type === type).map(d => d.number), prefix);

const getSavedState = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveState = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save state to localStorage', err);
  }
};

// Fusionne l'état cloud (source de vérité) avec l'état local par clé, en conservant
// les entrées locales absentes du cloud (créations pas encore synchronisées) au lieu
// de les écraser. Nécessaire car l'hydratation peut se répéter périodiquement
// (voir hydrateCloud) et une écrasement pur perdrait toute mutation locale en vol.
const mergeByKey = <T>(local: T[], cloud: T[], keyOf: (item: T) => string): T[] => {
  const cloudKeys = new Set(cloud.map(keyOf));
  const localOnly = local.filter(item => !cloudKeys.has(keyOf(item)));
  return [...cloud, ...localOnly];
};

export const getXPRequiredForLevel = (level: number): number => {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += i * 1000 + (i - 1) * 500;
  }
  return total;
};

export const getLevelFromXP = (xp: number): number => {
  let level = 1;
  while (xp >= getXPRequiredForLevel(level + 1)) {
    level++;
  }
  return level;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initialize state from local storage or mock defaults
  employees: getSavedState('gcp_employees', initialEmployees),
  projects: getSavedState('gcp_projects', initialProjects),
  punchSessions: getSavedState('gcp_punchSessions', initialPunchSessions),
  invoices: getSavedState('gcp_invoices', initialInvoices),
  catalogue: getSavedState('gcp_catalogue', initialCatalogue),
  suppliers: getSavedState('gcp_suppliers', initialSuppliers),
  inventory: getSavedState('gcp_inventory', initialInventory),
  orders: getSavedState('gcp_orders', initialOrders),
  clients: getSavedState('gcp_clients', initialClients),
  companyInfo: getSavedState('gcp_companyInfo', initialCompanyInfo),
  hrAlerts: getSavedState('gcp_hrAlerts', initialHRAlerts),
  documents: getSavedState('gcp_documents', initialDocuments),
  expenses: getSavedState('gcp_expenses', initialExpenses),
  payrollPayments: getSavedState('gcp_payrollPayments', initialPayrollPayments),
  motivationTeams: getSavedState('gcp_motivationTeams', initialMotivationTeams),
  motivationGoals: getSavedState('gcp_motivationGoals', initialMotivationGoals),
  weeklyGoals: getSavedState('gcp_weeklyGoals', initialWeeklyGoals),
  
  activeEmployee: getSavedState('gcp_activeEmployee', null),
  currentLanguage: getSavedState('gcp_currentLanguage', 'FR') as 'FR' | 'EN',
  currentTheme: getSavedState('gcp_currentTheme', 'quantum') as VisualTheme,
  offlineSyncStatus: 'synced',
  isOnboarded: getSavedState('gcp_isOnboarded', false),

  // Actions
  setIsOnboarded: (val) => {
    set({ isOnboarded: val });
    saveState('gcp_isOnboarded', val);
  },

  setLanguage: (currentLanguage) => {
    set({ currentLanguage });
    saveState('gcp_currentLanguage', currentLanguage);
  },
  
  setTheme: (currentTheme) => {
    set({ currentTheme });
    saveState('gcp_currentTheme', currentTheme);
  },

  login: (nip, employeeId) => {
    const { employees, currentLanguage } = get();
    const emp = employees.find(e => e.id === employeeId);
    
    if (!emp) {
      return { 
        success: false, 
        message: currentLanguage === 'FR' ? 'Employé non trouvé.' : 'Employee not found.' 
      };
    }
    
    if (emp.nip === nip) {
      set({ activeEmployee: emp });
      saveState('gcp_activeEmployee', emp);
      return { 
        success: true, 
        message: currentLanguage === 'FR' ? `Bienvenue, ${emp.name} !` : `Welcome, ${emp.name}!` 
      };
    }
    
    return { 
      success: false, 
      message: currentLanguage === 'FR' ? 'NIP incorrect.' : 'Incorrect PIN.' 
    };
  },

  logout: () => {
    set({ activeEmployee: null });
    saveState('gcp_activeEmployee', null);
  },

  // Employees CRUD
  addEmployee: (emp) => {
    const { employees } = get();
    const newEmp: Employee = {
      ...emp,
      id: genId(),
      level: 1,
      xp: 0
    };
    const updated = [...employees, newEmp];
    set({ employees: updated });
    saveState('gcp_employees', updated);
    syncInsert('app_users', employeeToRow(newEmp));

    // Auto trigger alert
    get().addHRAlert({
      type: 'info',
      title: 'Nouvel employé embauché',
      message: `L'employé ${newEmp.name} (${newEmp.workerType}) a été ajouté administrativement.`,
      employeeId: newEmp.id,
      employeeName: newEmp.name
    });
  },

  updateEmployee: (emp) => {
    const { employees, activeEmployee } = get();
    const updated = employees.map(e => e.id === emp.id ? emp : e);
    set({ employees: updated });
    saveState('gcp_employees', updated);
    syncUpdate('app_users', emp.id, employeeToRow(emp));

    if (activeEmployee && activeEmployee.id === emp.id) {
      set({ activeEmployee: emp });
      saveState('gcp_activeEmployee', emp);
    }
  },

  deleteEmployee: (id) => {
    const { employees, activeEmployee, projects, motivationTeams, weeklyGoals } = get();
    const updated = employees.filter(e => e.id !== id);
    set({ employees: updated });
    saveState('gcp_employees', updated);
    syncDelete('app_users', id);

    // Nettoie les références à l'employé supprimé pour éviter des données fantômes
    const updatedProjects = projects.map(p => ({
      ...p,
      assignedEmployees: p.assignedEmployees.filter(empId => empId !== id)
    }));
    set({ projects: updatedProjects });
    saveState('gcp_projects', updatedProjects);
    updatedProjects.forEach((p, idx) => {
      if (p.assignedEmployees.length !== projects[idx].assignedEmployees.length) syncProjectChildren(p);
    });

    const updatedTeams = motivationTeams.map(team => ({
      ...team,
      memberIds: team.memberIds.filter(empId => empId !== id),
      leaderId: team.leaderId === id ? undefined : team.leaderId
    }));
    set({ motivationTeams: updatedTeams });
    saveState('gcp_motivationTeams', updatedTeams);
    updatedTeams.forEach((team, idx) => {
      if (team.memberIds.length !== motivationTeams[idx].memberIds.length || team.leaderId !== motivationTeams[idx].leaderId) {
        syncUpdate('motivation_teams', team.id, motivationTeamToRow(team));
      }
    });

    const updatedWeeklyGoals = weeklyGoals.filter(wg => wg.employeeId !== id);
    set({ weeklyGoals: updatedWeeklyGoals });
    saveState('gcp_weeklyGoals', updatedWeeklyGoals);
    syncDelete('weekly_goals', id);

    // Déconnecte la session active si l'employé supprimé était celui connecté
    if (activeEmployee && activeEmployee.id === id) {
      set({ activeEmployee: null });
      saveState('gcp_activeEmployee', null);
    }
  },

  addXP: (employeeId, amount) => {
    const { employees, activeEmployee } = get();
    const updated = employees.map(e => {
      if (e.id === employeeId) {
        const newXp = e.xp + amount;
        const newLevel = getLevelFromXP(newXp);
        return {
          ...e,
          xp: newXp,
          level: newLevel > e.level ? newLevel : e.level
        };
      }
      return e;
    });
    set({ employees: updated });
    saveState('gcp_employees', updated);
    const changedEmp = updated.find(e => e.id === employeeId);
    if (changedEmp) syncUpdate('app_users', employeeId, { xp: changedEmp.xp, level: changedEmp.level });

    // Sync active session if this is the active employee
    if (activeEmployee && activeEmployee.id === employeeId) {
      const updatedActive = updated.find(e => e.id === employeeId) || null;
      set({ activeEmployee: updatedActive });
      saveState('gcp_activeEmployee', updatedActive);
    }

    get().recomputeGoalsAndStreaks();
  },

  // Teams Action
  addMotivationTeam: (team) => {
    const { motivationTeams } = get();
    const newTeam: MotivationTeam = {
      ...team,
      id: genId(),
      active: true,
      createdAt: new Date().toISOString()
    };
    const updated = [...motivationTeams, newTeam];
    set({ motivationTeams: updated });
    saveState('gcp_motivationTeams', updated);
    syncInsert('motivation_teams', motivationTeamToRow(newTeam));
    get().recomputeGoalsAndStreaks();
  },

  updateMotivationTeam: (team) => {
    const { motivationTeams } = get();
    const updated = motivationTeams.map(t => t.id === team.id ? team : t);
    set({ motivationTeams: updated });
    saveState('gcp_motivationTeams', updated);
    syncUpdate('motivation_teams', team.id, motivationTeamToRow(team));
    get().recomputeGoalsAndStreaks();
  },

  deleteMotivationTeam: (id) => {
    const { motivationTeams } = get();
    const updated = motivationTeams.filter(t => t.id !== id);
    set({ motivationTeams: updated });
    saveState('gcp_motivationTeams', updated);
    syncDelete('motivation_teams', id);
    get().recomputeGoalsAndStreaks();
  },

  // Motivation Goals Action
  addMotivationGoal: (goal) => {
    const { motivationGoals } = get();
    const newGoal: MotivationGoal = {
      ...goal,
      id: genId(),
      startDate: new Date().toISOString().split('T')[0],
      current: 0,
      status: 'active'
    };
    const updated = [...motivationGoals, newGoal];
    set({ motivationGoals: updated });
    saveState('gcp_motivationGoals', updated);
    syncInsert('motivation_goals', motivationGoalToRow(newGoal));
    get().recomputeGoalsAndStreaks();
  },

  updateMotivationGoal: (goal) => {
    const { motivationGoals } = get();
    const updated = motivationGoals.map(g => g.id === goal.id ? goal : g);
    set({ motivationGoals: updated });
    saveState('gcp_motivationGoals', updated);
    syncUpdate('motivation_goals', goal.id, motivationGoalToRow(goal));
    get().recomputeGoalsAndStreaks();
  },

  deleteMotivationGoal: (id) => {
    const { motivationGoals } = get();
    const updated = motivationGoals.filter(g => g.id !== id);
    set({ motivationGoals: updated });
    saveState('gcp_motivationGoals', updated);
    syncDelete('motivation_goals', id);
    get().recomputeGoalsAndStreaks();
  },

  manualProgressGoal: (goalId, increment) => {
    const { motivationGoals } = get();
    const updated = motivationGoals.map(g => {
      if (g.id === goalId) {
        const nextVal = Math.max(0, g.current + increment);
        const achievedStatus = nextVal >= g.target ? 'achieved' : g.status === 'achieved' && nextVal < g.target ? 'active' : g.status;
        return { ...g, current: nextVal, status: achievedStatus };
      }
      return g;
    });
    set({ motivationGoals: updated });
    saveState('gcp_motivationGoals', updated);
    const changedGoal = updated.find(g => g.id === goalId);
    if (changedGoal) syncUpdate('motivation_goals', goalId, motivationGoalToRow(changedGoal));
    get().recomputeGoalsAndStreaks();
  },

  recomputeGoalsAndStreaks: () => {
    const { punchSessions, employees, motivationTeams, motivationGoals, weeklyGoals } = get();
    const currentMonday = getStartOfWeekISO();
    
    // 1. Update WeeklyGoals
    const updatedWeeklyGoals = [...weeklyGoals];
    
    employees.forEach(emp => {
      let wgIdx = updatedWeeklyGoals.findIndex(wg => wg.employeeId === emp.id);
      
      // If none exists, create default
      if (wgIdx === -1) {
        updatedWeeklyGoals.push({
          employeeId: emp.id,
          targetAmount: emp.role === 'admin' ? 3000 : 1500, // default target
          currentAmount: 0,
          weekStart: currentMonday,
          xpPoints: emp.xp,
          level: emp.level,
          streak: 1,
          lastPunchDate: null
        });
        wgIdx = updatedWeeklyGoals.length - 1;
      }
      
      // Clone avant mutation : l'entrée peut être la même référence que dans
      // l'état précédent (weeklyGoals), la muter directement corromprait l'ancien snapshot.
      const wg = { ...updatedWeeklyGoals[wgIdx] };
      updatedWeeklyGoals[wgIdx] = wg;

      // Reset on new week
      if (wg.weekStart !== currentMonday) {
        wg.weekStart = currentMonday;
        wg.currentAmount = 0;
      }
      
      // Compute current week revenue
      const empPunchesThisWeek = punchSessions.filter(p => {
        if (p.employeeId !== emp.id) return false;
        const punchDate = p.startTime.split('T')[0];
        return punchDate >= currentMonday;
      });
      
      const weeklyRevenue = empPunchesThisWeek.reduce((sum, p) => sum + (p.revenue || 0), 0);
      wg.currentAmount = Number(weeklyRevenue.toFixed(2));
      
      // Sync XP and Level
      wg.xpPoints = emp.xp;
      wg.level = emp.level;
      
      // Streak logic
      const empPunches = punchSessions.filter(p => p.employeeId === emp.id && p.endTime !== null);
      if (empPunches.length > 0) {
        const sortedPunches = [...empPunches].sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        const uniqueDates = Array.from(new Set(sortedPunches.map(p => p.startTime.split('T')[0])));
        
        let streak = 0;
        let todayStr = new Date().toISOString().split('T')[0];
        let yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
          streak = 1;
          for (let i = 0; i < uniqueDates.length - 1; i++) {
            const currentD = new Date(uniqueDates[i]);
            const prevD = new Date(uniqueDates[i+1]);
            const diffTime = Math.abs(currentD.getTime() - prevD.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              streak++;
            } else if (diffDays > 1) {
              break;
            }
          }
        } else {
          streak = 0;
        }
        wg.streak = Math.max(1, streak);
        wg.lastPunchDate = uniqueDates[0] || null;
      }
    });
    
    // 2. Update Motivation Goals
    const updatedMotivationGoals = motivationGoals.map(goal => {
      let computedVal = goal.current;
      let relevantPunches = punchSessions.filter(p => p.endTime !== null);
      
      if (goal.scope === 'individual' && goal.employeeId) {
        relevantPunches = relevantPunches.filter(p => p.employeeId === goal.employeeId);
      } else if (goal.scope === 'team' && goal.teamId) {
        const team = motivationTeams.find(t => t.id === goal.teamId);
        if (team) {
          relevantPunches = relevantPunches.filter(p => team.memberIds.includes(p.employeeId));
        } else {
          relevantPunches = [];
        }
      }
      
      if (goal.metric === 'revenue') {
        computedVal = Number(relevantPunches.reduce((sum, p) => sum + (p.revenue || 0), 0).toFixed(2));
      } else if (goal.metric === 'hours') {
        computedVal = Number(relevantPunches.reduce((sum, p) => sum + (p.totalWorkedHours || 0), 0).toFixed(1));
      } else if (goal.metric === 'jobs_completed') {
        computedVal = relevantPunches.length;
      } else if (goal.metric === 'checklist_done') {
        computedVal = relevantPunches.reduce((sum, p) => sum + (p.surfaceMaterials?.reduce((s, m) => s + m.quantity, 0) || 0), 0);
      } else if (goal.metric === 'safety_days') {
        const safePunches = relevantPunches.filter(p => !p.attemptedOutsideGeofence);
        const uniqueSafeDates = new Set(safePunches.map(p => p.startTime.split('T')[0]));
        computedVal = uniqueSafeDates.size;
      } else {
        computedVal = goal.current;
      }
      
      let status = goal.status;
      if (status === 'active' && computedVal >= goal.target) {
        status = 'achieved';
        
        // Push notification simulation
        // Award XP on success
        if (goal.scope === 'individual' && goal.employeeId) {
          setTimeout(() => {
            get().addXP(goal.employeeId!, 500);
          }, 10);
        } else if (goal.scope === 'team' && goal.teamId) {
          const team = motivationTeams.find(t => t.id === goal.teamId);
          if (team) {
            setTimeout(() => {
              team.memberIds.forEach(mId => get().addXP(mId, 300));
            }, 10);
          }
        } else if (goal.scope === 'company') {
          setTimeout(() => {
            employees.forEach(e => get().addXP(e.id, 200));
          }, 10);
        }
      }
      
      return { ...goal, current: computedVal, status };
    });
    
    set({ weeklyGoals: updatedWeeklyGoals, motivationGoals: updatedMotivationGoals });
    saveState('gcp_weeklyGoals', updatedWeeklyGoals);
    saveState('gcp_motivationGoals', updatedMotivationGoals);
    updatedWeeklyGoals.forEach(wg => syncUpsert('weekly_goals', weeklyGoalToRow(wg)));
    updatedMotivationGoals.forEach(g => syncUpdate('motivation_goals', g.id, motivationGoalToRow(g)));
  },

  // Projects CRUD
  addProject: (proj) => {
    const { projects } = get();
    const newProj: Project = {
      ...proj,
      id: genId()
    };
    const updated = [...projects, newProj];
    set({ projects: updated });
    saveState('gcp_projects', updated);
    syncProjectInsert(newProj);
  },

  updateProject: (proj) => {
    const { projects } = get();
    const updated = projects.map(p => p.id === proj.id ? proj : p);
    set({ projects: updated });
    saveState('gcp_projects', updated);
    syncUpdate('projects', proj.id, projectToRow(proj));
    syncProjectChildren(proj);
  },

  deleteProject: (id) => {
    const { projects, motivationTeams } = get();
    const updated = projects.filter(p => p.id !== id);
    set({ projects: updated });
    saveState('gcp_projects', updated);
    syncDeleteProjectChildren(id).then(() => syncDelete('projects', id));

    // Retire toute référence au chantier supprimé dans les équipes de motivation
    const updatedTeams = motivationTeams.map(team => ({
      ...team,
      projectIds: team.projectIds?.filter(projId => projId !== id)
    }));
    set({ motivationTeams: updatedTeams });
    saveState('gcp_motivationTeams', updatedTeams);
  },

  // Catalogue CRUD
  addCatalogueMaterial: (item) => {
    const { catalogue } = get();
    const newItem: CatalogueMaterial = {
      ...item,
      id: genId()
    };
    const updated = [...catalogue, newItem];
    set({ catalogue: updated });
    saveState('gcp_catalogue', updated);
    syncInsert('catalog_items', catalogueToRow(newItem));
  },

  updateCatalogueMaterial: (item) => {
    const { catalogue } = get();
    const updated = catalogue.map(c => c.id === item.id ? item : c);
    set({ catalogue: updated });
    saveState('gcp_catalogue', updated);
    syncUpdate('catalog_items', item.id, catalogueToRow(item));
  },

  deleteCatalogueMaterial: (id) => {
    const { catalogue } = get();
    const updated = catalogue.filter(c => c.id !== id);
    set({ catalogue: updated });
    saveState('gcp_catalogue', updated);
    syncDelete('catalog_items', id);
  },

  // Supplier CRUD
  addSupplier: (supplier) => {
    const { suppliers } = get();
    const newSupplier: Supplier = {
      ...supplier,
      id: genId()
    };
    const updated = [...suppliers, newSupplier];
    set({ suppliers: updated });
    saveState('gcp_suppliers', updated);
    syncInsert('suppliers', supplierToRow(newSupplier));
  },

  updateSupplier: (supplier) => {
    const { suppliers } = get();
    const updated = suppliers.map(s => s.id === supplier.id ? supplier : s);
    set({ suppliers: updated });
    saveState('gcp_suppliers', updated);
    syncUpdate('suppliers', supplier.id, supplierToRow(supplier));
  },

  deleteSupplier: (id) => {
    const { suppliers } = get();
    const updated = suppliers.filter(s => s.id !== id);
    set({ suppliers: updated });
    saveState('gcp_suppliers', updated);
    syncDelete('suppliers', id);
  },

  // Inventory CRUD
  addInventoryItem: (item) => {
    const { inventory } = get();
    const newItem: InventoryItem = {
      ...item,
      id: genId()
    };
    const updated = [...inventory, newItem];
    set({ inventory: updated });
    saveState('gcp_inventory', updated);
    syncInsert('inventory_items', inventoryToRow(newItem));
  },

  updateInventoryItem: (item) => {
    const { inventory } = get();
    const updated = inventory.map(i => i.id === item.id ? item : i);
    set({ inventory: updated });
    saveState('gcp_inventory', updated);
    syncUpdate('inventory_items', item.id, inventoryToRow(item));

    // Trigger alert if stock is critical
    if (item.quantity < item.minThreshold) {
      get().addHRAlert({
        type: 'warning',
        title: 'Stock critique détecté',
        message: `Le matériau "${item.name}" (${item.quantity} ${item.unit}) est passé sous le seuil minimum de ${item.minThreshold}.`
      });
    }
  },

  deleteInventoryItem: (id) => {
    const { inventory } = get();
    const updated = inventory.filter(i => i.id !== id);
    set({ inventory: updated });
    saveState('gcp_inventory', updated);
    syncDelete('inventory_items', id);
  },

  // Orders CRUD
  addSupplierOrder: (order) => {
    const { orders, inventory } = get();
    const newOrder: SupplierOrder = {
      ...order,
      id: genId()
    };
    const updatedOrders = [...orders, newOrder];
    set({ orders: updatedOrders });
    saveState('gcp_orders', updatedOrders);
    syncInsert('supplier_orders', supplierOrderToRow(newOrder));
    syncOrderItems(newOrder);

    // If order received, update stock
    if (newOrder.status === 'received') {
      const updatedInventory = inventory.map(invItem => {
        const orderItem = newOrder.items.find(item => item.name.toLowerCase() === invItem.name.toLowerCase());
        if (orderItem) {
          const nextItem = { ...invItem, quantity: invItem.quantity + orderItem.quantity };
          syncUpdate('inventory_items', nextItem.id, inventoryToRow(nextItem));
          return nextItem;
        }
        return invItem;
      });
      set({ inventory: updatedInventory });
      saveState('gcp_inventory', updatedInventory);
    }
  },

  updateSupplierOrder: (order) => {
    const { orders, inventory } = get();
    // Check if status changed to received
    const original = orders.find(o => o.id === order.id);
    const updatedOrders = orders.map(o => o.id === order.id ? order : o);
    set({ orders: updatedOrders });
    saveState('gcp_orders', updatedOrders);
    syncUpdate('supplier_orders', order.id, supplierOrderToRow(order));
    syncOrderItems(order);

    if (original && original.status !== 'received' && order.status === 'received') {
      // Add items to stock
      const updatedInventory = inventory.map(invItem => {
        const orderItem = order.items.find(item => item.name.toLowerCase() === invItem.name.toLowerCase());
        if (orderItem) {
          const nextItem = { ...invItem, quantity: invItem.quantity + orderItem.quantity };
          syncUpdate('inventory_items', nextItem.id, inventoryToRow(nextItem));
          return nextItem;
        }
        return invItem;
      });
      set({ inventory: updatedInventory });
      saveState('gcp_inventory', updatedInventory);
    }
  },

  // Clients CRUD
  addClient: (cli) => {
    const { clients } = get();
    const newCli: Client = {
      ...cli,
      id: genId()
    };
    const updated = [...clients, newCli];
    set({ clients: updated });
    saveState('gcp_clients', updated);
    syncInsert('clients', clientToRow(newCli));
  },

  updateClient: (cli) => {
    const { clients } = get();
    const updated = clients.map(c => c.id === cli.id ? cli : c);
    set({ clients: updated });
    saveState('gcp_clients', updated);
    syncUpdate('clients', cli.id, clientToRow(cli));
  },

  deleteClient: (id) => {
    const { clients } = get();
    const updated = clients.filter(c => c.id !== id);
    set({ clients: updated });
    saveState('gcp_clients', updated);
    syncDelete('clients', id);
  },

  // Company Info Update
  updateCompanyInfo: (info) => {
    const { companyInfo } = get();
    const updated = { ...companyInfo, ...info };
    set({ companyInfo: updated });
    saveState('gcp_companyInfo', updated);
    const companyId = getCompanyId();
    if (companyId) syncUpdate('companies', companyId, companyInfoToRow(updated));
  },

  // HR Alerts
  addHRAlert: (alert) => {
    const { hrAlerts } = get();
    const newAlert: HRAlert = {
      ...alert,
      id: genId(),
      date: new Date().toISOString(),
      resolved: false
    };
    const updated = [newAlert, ...hrAlerts];
    set({ hrAlerts: updated });
    saveState('gcp_hrAlerts', updated);
    syncInsert('hr_alerts', hrAlertToRow(newAlert));
  },

  resolveHRAlert: (id) => {
    const { hrAlerts } = get();
    const updated = hrAlerts.map(h => h.id === id ? { ...h, resolved: true } : h);
    set({ hrAlerts: updated });
    saveState('gcp_hrAlerts', updated);
    syncUpdate('hr_alerts', id, { resolved: true });
  },

  // Punch Sessions
  startPunchSession: ({ employeeId, projectId, payMode, rate, withinGeofence, attemptedOutsideGeofence, outsideDetails }) => {
    const { punchSessions, employees, projects } = get();
    const emp = employees.find(e => e.id === employeeId);
    const proj = projects.find(p => p.id === projectId);
    
    if (!emp || !proj) return;

    // Check if employee already has active punch
    const active = punchSessions.find(p => p.employeeId === employeeId && p.endTime === null);
    if (active) return; // Prevent multiple active punches

    const newPunch: PunchSession = {
      id: genId(),
      employeeId,
      employeeName: emp.name,
      projectId,
      projectName: proj.name,
      payMode,
      rate,
      startTime: new Date().toISOString(),
      endTime: null,
      pausedAt: null,
      totalPauseMinutes: 0,
      withinGeofence,
      attemptedOutsideGeofence,
      outsideDetails,
      revenue: 0
    };

    const updated = [newPunch, ...punchSessions];
    set({ punchSessions: updated });
    saveState('gcp_punchSessions', updated);
    syncInsert('punches', punchToRow(newPunch));

    // If attempted outside geofence, log infraction as HR alert
    if (attemptedOutsideGeofence) {
      get().addHRAlert({
        type: 'danger',
        title: 'Tentative de Punch hors-zone',
        message: `${emp.name} a tenté de puncher sur le chantier "${proj.name}" mais était ${outsideDetails || 'hors zone'}.`,
        employeeId: emp.id,
        employeeName: emp.name
      });
    }
  },

  pausePunchSession: (id) => {
    const { punchSessions } = get();
    const updated = punchSessions.map(p => {
      if (p.id === id) {
        return {
          ...p,
          pausedAt: new Date().toISOString()
        };
      }
      return p;
    });
    set({ punchSessions: updated });
    saveState('gcp_punchSessions', updated);
    const paused = updated.find(p => p.id === id);
    if (paused) syncUpdate('punches', id, { paused_at: paused.pausedAt });
  },

  resumePunchSession: (id) => {
    const { punchSessions } = get();
    const updated = punchSessions.map(p => {
      if (p.id === id && p.pausedAt) {
        const pauseStart = new Date(p.pausedAt).getTime();
        const pauseEnd = new Date().getTime();
        const diffMinutes = Math.floor((pauseEnd - pauseStart) / 60000);
        return {
          ...p,
          pausedAt: null,
          totalPauseMinutes: p.totalPauseMinutes + diffMinutes
        };
      }
      return p;
    });
    set({ punchSessions: updated });
    saveState('gcp_punchSessions', updated);
    const resumed = updated.find(p => p.id === id);
    if (resumed) syncUpdate('punches', id, { paused_at: null, total_pause_minutes: resumed.totalPauseMinutes });
  },

  stopPunchSession: (id, surfaceMaterials) => {
    const { punchSessions } = get();
    const updated = punchSessions.map(p => {
      if (p.id === id) {
        const endTime = new Date().toISOString();
        const start = new Date(p.startTime).getTime();
        const end = new Date(endTime).getTime();

        // Si la session est toujours en pause au moment de l'arrêt, on compte
        // le temps de pause en cours pour ne pas le facturer comme du travail.
        let totalPauseMinutes = p.totalPauseMinutes;
        if (p.pausedAt) {
          const pauseStart = new Date(p.pausedAt).getTime();
          totalPauseMinutes += Math.floor((end - pauseStart) / 60000);
        }

        let totalWorkedHours = (end - start) / 3600000; // hours in decimal
        // Subtract pause minutes
        totalWorkedHours = Math.max(0, totalWorkedHours - (totalPauseMinutes / 60));

        let revenue = 0;
        if (p.payMode === 'horaire') {
          revenue = Number((totalWorkedHours * p.rate).toFixed(2));
        } else if (p.payMode === 'forfait') {
          revenue = p.rate;
        } else if (p.payMode === 'surface') {
          // If surface, rely on input materials done
          const materialsCost = surfaceMaterials?.reduce((sum, mat) => sum + (mat.quantity * mat.unitPrice), 0) || 0;
          revenue = materialsCost;
        }

        return {
          ...p,
          endTime,
          pausedAt: null,
          totalPauseMinutes,
          totalWorkedHours: Number(totalWorkedHours.toFixed(2)),
          surfaceMaterials,
          revenue
        };
      }
      return p;
    });

    set({ punchSessions: updated });
    saveState('gcp_punchSessions', updated);

    // Give some XP for completing work session!
    const stoppedPunch = updated.find(p => p.id === id);
    if (stoppedPunch) {
      syncUpdate('punches', id, punchToRow(stoppedPunch));
      const xpPoints = stoppedPunch.payMode === 'surface' ? 350 : Math.ceil((stoppedPunch.totalWorkedHours || 0) * 50);
      get().addXP(stoppedPunch.employeeId, xpPoints);

      // Save a log of inventory material removal if surface materials were declared
      if (surfaceMaterials && surfaceMaterials.length > 0) {
        const { inventory } = get();
        const updatedInventory = inventory.map(item => {
          const used = surfaceMaterials.find(m => m.name.toLowerCase() === item.name.toLowerCase());
          if (used) {
            const newQty = Math.max(0, item.quantity - used.quantity);
            const nextItem = { ...item, quantity: newQty };
            syncUpdate('inventory_items', nextItem.id, inventoryToRow(nextItem));
            return nextItem;
          }
          return item;
        });
        set({ inventory: updatedInventory });
        saveState('gcp_inventory', updatedInventory);
      }
    }
  },

  // Invoices actions
  addInvoice: (inv) => {
    const { invoices } = get();
    const newInvoice: Invoice = {
      ...inv,
      id: genId(),
      invoiceNumber: nextSequentialNumber(invoices.map(i => i.invoiceNumber), 'INV')
    };
    const updated = [newInvoice, ...invoices];
    set({ invoices: updated });
    saveState('gcp_invoices', updated);
    syncInsert('payroll_entries', invoiceToRow(newInvoice));
  },

  updateInvoice: (inv) => {
    const { invoices } = get();
    const updated = invoices.map(i => i.id === inv.id ? inv : i);
    set({ invoices: updated });
    saveState('gcp_invoices', updated);
    syncUpdate('payroll_entries', inv.id, invoiceToRow(inv));
  },

  generateDraftInvoiceForEmployee: (employeeId) => {
    const { punchSessions, invoices, employees, companyInfo } = get();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    // Find all completed punch sessions for this employee that are not yet in any invoice
    const invoicedSessionIds = new Set(invoices.flatMap(inv => inv.sessionIds));
    const unInvoicedPunches = punchSessions.filter(p => 
      p.employeeId === employeeId && 
      p.endTime !== null && 
      !invoicedSessionIds.has(p.id)
    );

    if (unInvoicedPunches.length === 0) return;

    const totalHours = unInvoicedPunches.reduce((sum, p) => sum + (p.totalWorkedHours || 0), 0);
    const amount = unInvoicedPunches.reduce((sum, p) => sum + p.revenue, 0);
    const comp = get().companyInfo;
    const gstRate = comp.taxRate1 !== undefined ? comp.taxRate1 : 0.05;
    const qstRate = comp.taxRate2 !== undefined ? comp.taxRate2 : 0.09975;
    
    const gstAmount = Number((amount * gstRate).toFixed(2));
    const qstAmount = Number((amount * qstRate).toFixed(2));
    const totalWithTaxes = Number((amount + gstAmount + qstAmount).toFixed(2));

    const newInvoice: Invoice = {
      id: genId(),
      employeeId,
      employeeName: emp.name,
      invoiceNumber: nextSequentialNumber(invoices.map(i => i.invoiceNumber), 'INV'),
      date: new Date().toISOString().split('T')[0],
      sessionIds: unInvoicedPunches.map(p => p.id),
      totalHours: Number(totalHours.toFixed(2)),
      amount: Number(amount.toFixed(2)),
      gstAmount,
      qstAmount,
      totalWithTaxes,
      status: 'draft',
      taxIncluded: false,
      notes: `Facture brouillon auto-générée le ${new Date().toLocaleDateString('fr-CA')}.`
    };

    const updated = [newInvoice, ...invoices];
    set({ invoices: updated });
    saveState('gcp_invoices', updated);
    syncInsert('payroll_entries', invoiceToRow(newInvoice));
  },

  // System A: Client Documents actions implementation with auto-calculations
  addGCPDocument: (doc) => {
    const { documents } = get();
    const prefix = doc.type === 'invoice' ? 'FAC' : doc.type === 'quote' ? 'DEV' : 'CON';
    const number = getNextDocNumber(documents, doc.type, prefix);

    // Auto-calculate financial variables
    let subtotal = 0;
    if (doc.isSimpleLayout) {
      subtotal = doc.lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    } else {
      const mat = doc.materialLines.reduce((sum, item) => sum + (item.qtySqft * item.unitPrice), 0);
      const lab = doc.labourLines.reduce((sum, item) => sum + (item.isFlatRate ? item.rate : item.estimatedHours * item.rate), 0);
      const oth = doc.otherLines.reduce((sum, item) => sum + item.amount, 0);
      const sub = doc.subcontractLines.reduce((sum, item) => sum + item.amount, 0);
      subtotal = mat + lab + oth + sub;
    }

    const discountAmount = subtotal * (doc.discountPct / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = Number((taxable * (doc.taxRate / 100)).toFixed(2));
    const total = Number((taxable + taxAmount).toFixed(2));
    const holdbackAmount = Number((total * (doc.holdbackPct / 100)).toFixed(2));
    
    const paidSum = doc.paymentsHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balanceDue = Number((total - holdbackAmount - paidSum).toFixed(2));

    const newDoc: GCPDocument = {
      ...doc,
      id: genId(),
      number,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount,
      total,
      holdbackAmount,
      balanceDue
    };

    const updated = [newDoc, ...documents];
    set({ documents: updated });
    saveState('gcp_documents', updated);
    syncDocumentInsert(newDoc);
  },

  updateGCPDocument: (doc) => {
    const { documents } = get();
    
    // Recompute on update to keep financials robust and fresh
    let subtotal = 0;
    if (doc.isSimpleLayout) {
      subtotal = doc.lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    } else {
      const mat = doc.materialLines.reduce((sum, item) => sum + (item.qtySqft * item.unitPrice), 0);
      const lab = doc.labourLines.reduce((sum, item) => sum + (item.isFlatRate ? item.rate : item.estimatedHours * item.rate), 0);
      const oth = doc.otherLines.reduce((sum, item) => sum + item.amount, 0);
      const sub = doc.subcontractLines.reduce((sum, item) => sum + item.amount, 0);
      subtotal = mat + lab + oth + sub;
    }

    const discountAmount = subtotal * (doc.discountPct / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = Number((taxable * (doc.taxRate / 100)).toFixed(2));
    const total = Number((taxable + taxAmount).toFixed(2));
    const holdbackAmount = Number((total * (doc.holdbackPct / 100)).toFixed(2));
    
    const paidSum = doc.paymentsHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balanceDue = Number((total - holdbackAmount - paidSum).toFixed(2));

    const updatedGCPDoc: GCPDocument = {
      ...doc,
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount,
      total,
      holdbackAmount,
      balanceDue
    };

    const updated = documents.map(d => d.id === doc.id ? updatedGCPDoc : d);
    set({ documents: updated });
    saveState('gcp_documents', updated);
    syncUpdate('documents', doc.id, documentToRow(updatedGCPDoc));
    syncDocumentLines(updatedGCPDoc);
  },

  deleteGCPDocument: (id) => {
    const { documents } = get();
    const updated = documents.filter(d => d.id !== id);
    set({ documents: updated });
    saveState('gcp_documents', updated);
    syncDelete('documents', id);
  },

  convertQuoteToInvoice: (quoteId) => {
    const { documents } = get();
    const quote = documents.find(d => d.id === quoteId && d.type === 'quote');
    if (!quote) return;

    const number = getNextDocNumber(documents, 'invoice', 'FAC');

    const invoice: GCPDocument = {
      ...quote,
      id: genId(),
      type: 'invoice',
      number,
      status: 'draft',
      refQuote: quote.number,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0],
      // Régénère les identifiants des lignes copiées du devis : elles gardaient sinon
      // les mêmes id que les lignes du devis, ce qui provoquait une collision de clé
      // primaire lors de la synchronisation cloud (document_items.id est unique).
      lineItems: quote.lineItems.map(l => ({ ...l, id: genId() })),
      materialLines: quote.materialLines.map(l => ({ ...l, id: genId() })),
      labourLines: quote.labourLines.map(l => ({ ...l, id: genId() })),
      otherLines: quote.otherLines.map(l => ({ ...l, id: genId() })),
      subcontractLines: quote.subcontractLines.map(l => ({ ...l, id: genId() }))
    };

    const updated = [invoice, ...documents];
    set({ documents: updated });
    saveState('gcp_documents', updated);
    syncDocumentInsert(invoice);
  },

  addPartialPayment: (id, amount, method, notes) => {
    const { documents } = get();
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    const newPayment: GCPDocumentPaymentHistoryEntry = {
      id: genId(),
      date: new Date().toISOString().split('T')[0],
      amount,
      method,
      notes: notes || 'Paiement partiel enregistré'
    };

    const updatedHistory = [...(doc.paymentsHistory || []), newPayment];
    
    // Compute new balance
    const totalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Number((doc.total - doc.holdbackAmount - totalPaid).toFixed(2));
    
    // Auto status transition to paid if balance is zero or less
    const status = balanceDue <= 0 ? 'paid' : doc.status;

    const updatedDoc: GCPDocument = {
      ...doc,
      paymentsHistory: updatedHistory,
      balanceDue,
      status
    };

    const updated = documents.map(d => d.id === id ? updatedDoc : d);
    set({ documents: updated });
    saveState('gcp_documents', updated);
    syncUpdate('documents', id, { balance_due: balanceDue, status });
    syncInsert('document_payments', documentPaymentToRow(newPayment, id));
  },

  addExpense: (exp) => {
    const { expenses } = get();
    const newExp: ExpenseRecord = {
      ...exp,
      id: genId()
    };
    const updated = [newExp, ...expenses];
    set({ expenses: updated });
    saveState('gcp_expenses', updated);
    syncInsert('expenses', expenseToRow(newExp));
  },

  deleteExpense: (id) => {
    const { expenses } = get();
    const updated = expenses.filter(e => e.id !== id);
    set({ expenses: updated });
    saveState('gcp_expenses', updated);
    syncDelete('expenses', id);
  },

  addPayrollPayment: (pay) => {
    const { payrollPayments } = get();
    const newPay: PayrollPayment = {
      ...pay,
      id: genId()
    };
    const updated = [newPay, ...payrollPayments];
    set({ payrollPayments: updated });
    saveState('gcp_payrollPayments', updated);
    syncInsert('payroll_payments', payrollPaymentToRow(newPay));
  },

  deletePayrollPayment: (id) => {
    const { payrollPayments } = get();
    const updated = payrollPayments.filter(p => p.id !== id);
    set({ payrollPayments: updated });
    saveState('gcp_payrollPayments', updated);
    syncDelete('payroll_payments', id);
  },

  hydrateCloud: async () => {
    const result = await hydrateFromCloud();
    if (!result.enabled) {
      set({ offlineSyncStatus: 'offline' });
      return;
    }
    const t = result.tables;
    const employees = (t.app_users || []).map(rowToEmployee);
    const assignments = t.project_assignments || [];
    const tasks = t.project_tasks || [];
    const tools = t.project_tools || [];
    const projects = (t.projects || []).map((r: any) => rowToProject(r, tasks, tools, assignments));
    const punchSessions = (t.punches || []).map(rowToPunch);
    const invoices = (t.payroll_entries || []).map(rowToInvoice);
    const catalogue = (t.catalog_items || []).map(rowToCatalogue);
    const suppliers = (t.suppliers || []).map(rowToSupplier);
    const inventory = (t.inventory_items || []).map(rowToInventory);
    const orderItems = t.supplier_order_items || [];
    const orders = (t.supplier_orders || []).map((r: any) => rowToSupplierOrder(r, orderItems));
    const clients = (t.clients || []).map(rowToClient);
    const hrAlerts = (t.hr_alerts || []).map(rowToHRAlert);
    const documentItems = t.document_items || [];
    const documentPayments = t.document_payments || [];
    const documents = (t.documents || []).map((r: any) => rowToDocument(r, documentItems, documentPayments));
    const expenses = (t.expenses || []).map(rowToExpense);
    const payrollPayments = (t.payroll_payments || []).map(rowToPayrollPayment);
    const motivationTeams = (t.motivation_teams || []).map(rowToMotivationTeam);
    const motivationGoals = (t.motivation_goals || []).map(rowToMotivationGoal);
    const weeklyGoals = (t.weekly_goals || []).map(rowToWeeklyGoal);
    const companyRow = (t.companies || [])[0];

    set(state => {
      const next: Partial<AppState> = {
        offlineSyncStatus: 'synced',
        employees: mergeByKey(state.employees, employees, e => e.id),
        projects: mergeByKey(state.projects, projects, p => p.id),
        punchSessions: mergeByKey(state.punchSessions, punchSessions, p => p.id),
        invoices: mergeByKey(state.invoices, invoices, i => i.id),
        catalogue: mergeByKey(state.catalogue, catalogue, c => c.id),
        suppliers: mergeByKey(state.suppliers, suppliers, s => s.id),
        inventory: mergeByKey(state.inventory, inventory, i => i.id),
        orders: mergeByKey(state.orders, orders, o => o.id),
        clients: mergeByKey(state.clients, clients, c => c.id),
        hrAlerts: mergeByKey(state.hrAlerts, hrAlerts, h => h.id),
        documents: mergeByKey(state.documents, documents, d => d.id),
        expenses: mergeByKey(state.expenses, expenses, e => e.id),
        payrollPayments: mergeByKey(state.payrollPayments, payrollPayments, p => p.id),
        motivationTeams: mergeByKey(state.motivationTeams, motivationTeams, m => m.id),
        motivationGoals: mergeByKey(state.motivationGoals, motivationGoals, g => g.id),
        weeklyGoals: mergeByKey(state.weeklyGoals, weeklyGoals, w => w.employeeId)
      };
      if (companyRow) {
        // rowToCompanyInfo renvoie explicitement `undefined` pour chaque colonne
        // vide en base. Les épandre tels quels écraserait les valeurs locales
        // (dont la clé API IA fraîchement saisie) avec du vide à chaque
        // rechargement — on ne garde donc que les champs réellement renseignés.
        const cloudInfo: Record<string, any> = { ...rowToCompanyInfo(companyRow) };
        Object.keys(cloudInfo).forEach(k => { if (cloudInfo[k] === undefined) delete cloudInfo[k]; });
        const bd = cloudInfo.bankDetails;
        if (bd && !bd.bank && !bd.transit && !bd.institution && !bd.account) delete cloudInfo.bankDetails;
        next.companyInfo = { ...state.companyInfo, ...cloudInfo };
      }
      return next as AppState;
    });

    const s = get();
    saveState('gcp_employees', s.employees);
    saveState('gcp_projects', s.projects);
    saveState('gcp_punchSessions', s.punchSessions);
    saveState('gcp_invoices', s.invoices);
    saveState('gcp_catalogue', s.catalogue);
    saveState('gcp_suppliers', s.suppliers);
    saveState('gcp_inventory', s.inventory);
    saveState('gcp_orders', s.orders);
    saveState('gcp_clients', s.clients);
    saveState('gcp_hrAlerts', s.hrAlerts);
    saveState('gcp_documents', s.documents);
    saveState('gcp_expenses', s.expenses);
    saveState('gcp_payrollPayments', s.payrollPayments);
    saveState('gcp_motivationTeams', s.motivationTeams);
    saveState('gcp_motivationGoals', s.motivationGoals);
    saveState('gcp_weeklyGoals', s.weeklyGoals);
    saveState('gcp_companyInfo', s.companyInfo);

    // Répare la base si la clé API IA a été enregistrée localement avant que la
    // synchro cloud soit prête (updateCompanyInfo ne pouvait alors pas la pousser,
    // faute de companyId résolu) : on la synchronise maintenant.
    if (result.companyId && companyRow && !companyRow.ai_api_key && s.companyInfo.aiApiKey) {
      syncUpdate('companies', result.companyId, companyInfoToRow(s.companyInfo));
    }
  }
}));
export default useAppStore;
