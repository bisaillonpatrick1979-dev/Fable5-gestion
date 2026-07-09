export interface TaxRegion {
  code: string;
  nameFR: string;
  nameEN: string;
  taxRate1: number; // For Canada: GST (0.05 or 0.13/0.15 for HST). For US: 0
  taxRate2: number; // For Canada: PST/QST. For US: State Tax
  taxRate1NameFR: string;
  taxRate1NameEN: string;
  taxRate2NameFR: string;
  taxRate2NameEN: string;
}

// Métadonnées de paie et de conformité qui varient par province / état, pour
// que l'application ne présume plus que tous les utilisateurs sont au Québec.
export interface RegionPayrollMeta {
  pensionNameFR: string;
  pensionNameEN: string;
  pensionRate: number; // part employé
  secondaryDeductionNameFR: string; // Assurance-emploi (CA) ou Medicare (US)
  secondaryDeductionNameEN: string;
  secondaryDeductionRate: number;
  workersCompNameFR: string;
  workersCompNameEN: string;
  hasConstructionUnionCert: boolean; // Carte de compétence CCQ : uniquement au Québec
  breakRuleFR: string;
  breakRuleEN: string;
  businessNumberLabelFR: string;
  businessNumberLabelEN: string;
}

// Préposition française correcte devant le nom d'une province ("du Québec",
// "de l'Alberta", "de la Saskatchewan"...), pour éviter les tournures comme
// "de Alberta". Repli générique pour les états américains.
const CA_REGION_PREPOSITION: Record<string, string> = {
  QC: 'du Québec',
  ON: "de l'Ontario",
  BC: 'de la Colombie-Britannique',
  AB: "de l'Alberta",
  SK: 'de la Saskatchewan',
  MB: 'du Manitoba',
  NB: 'du Nouveau-Brunswick',
  NS: 'de la Nouvelle-Écosse',
  PE: "de l'Île-du-Prince-Édouard",
  NL: 'de Terre-Neuve-et-Labrador',
  YT: 'du Yukon',
  NT: 'des Territoires du Nord-Ouest',
  NU: 'du Nunavut',
};

export function regionWithPreposition(region: TaxRegion, country: 'CA' | 'US'): string {
  if (country === 'CA' && CA_REGION_PREPOSITION[region.code]) {
    return CA_REGION_PREPOSITION[region.code];
  }
  return `de ${region.nameFR}`;
}

const CA_WORKERS_COMP_BOARD: Record<string, string> = {
  QC: 'CNESST',
  ON: 'WSIB',
  BC: 'WorkSafeBC',
  AB: 'WCB-Alberta',
  SK: 'WCB-Saskatchewan',
  MB: 'WCB-Manitoba',
  NB: 'WorkSafeNB',
  NS: 'WCB Nouvelle-Écosse',
  PE: 'WCB Î.-P.-É.',
  NL: 'WorkplaceNL',
  YT: 'WCB Yukon',
  NT: 'WSCC (T.N.-O.)',
  NU: 'WSCC (Nunavut)',
};

export function getRegionPayrollMeta(region: TaxRegion, country: 'CA' | 'US'): RegionPayrollMeta {
  if (country === 'US') {
    return {
      pensionNameFR: 'Sécurité sociale (Social Security)',
      pensionNameEN: 'Social Security',
      pensionRate: 0.062,
      secondaryDeductionNameFR: 'Medicare',
      secondaryDeductionNameEN: 'Medicare',
      secondaryDeductionRate: 0.0145,
      workersCompNameFR: `Assurance accidents du travail (${region.nameFR})`,
      workersCompNameEN: `Workers' Comp (${region.nameEN})`,
      hasConstructionUnionCert: false,
      breakRuleFR: `Consultez la réglementation du travail de ${region.nameFR} pour les pauses obligatoires sur les chantiers. Les règles varient par état.`,
      breakRuleEN: `Check ${region.nameEN}'s labor regulations for required job-site breaks. Rules vary by state.`,
      businessNumberLabelFR: "Numéro d'employeur (EIN)",
      businessNumberLabelEN: 'Employer ID Number (EIN)',
    };
  }

  const isQC = region.code === 'QC';
  const workersCompName = CA_WORKERS_COMP_BOARD[region.code] || 'Commission des accidents du travail';

  return {
    pensionNameFR: isQC ? 'RRQ (Régime de rentes du Québec)' : 'RPC (Régime de pensions du Canada)',
    pensionNameEN: isQC ? 'QPP (Quebec Pension Plan)' : 'CPP (Canada Pension Plan)',
    pensionRate: isQC ? 0.064 : 0.0595,
    secondaryDeductionNameFR: 'Assurance-emploi (AE)',
    secondaryDeductionNameEN: 'Employment Insurance (EI)',
    secondaryDeductionRate: isQC ? 0.0131 : 0.0166, // Taux réduit au Québec (couvert en partie par le RQAP)
    workersCompNameFR: workersCompName,
    workersCompNameEN: workersCompName,
    hasConstructionUnionCert: isQC,
    breakRuleFR: isQC
      ? "Les pauses réglementaires québécoises de construction (15 mins de pause à 10h et 15h) ne sont pas déductibles des heures de paie finales."
      : `Consultez les normes du travail ${regionWithPreposition(region, country)} pour les pauses réglementaires applicables aux chantiers de construction.`,
    breakRuleEN: isQC
      ? "Quebec's construction regulatory breaks (15 min at 10am and 3pm) are not deductible from final payroll hours."
      : `Check ${region.nameEN}'s employment standards for construction job-site break requirements.`,
    businessNumberLabelFR: isQC ? "NEQ (Numéro d'entreprise du Québec)" : "Numéro d'entreprise (NE)",
    businessNumberLabelEN: isQC ? 'Quebec Business Number (NEQ)' : 'Business Number (BN)',
  };
}

// Barèmes d'impôt progressif fédéral et provinciaux (estimations, à valider avec un comptable).
export interface TaxBracket {
  upTo: number; // Infinity pour la dernière tranche
  rate: number;
}

export const CA_FEDERAL_BRACKETS: TaxBracket[] = [
  { upTo: 55867, rate: 0.15 },
  { upTo: 111733, rate: 0.205 },
  { upTo: 173205, rate: 0.26 },
  { upTo: Infinity, rate: 0.29 },
];

// Barèmes provinciaux connus (QC, ON, AB, BC). Les autres provinces utilisent
// un taux forfaitaire approximatif (voir CA_PROVINCIAL_FALLBACK_RATE).
export const CA_PROVINCIAL_BRACKETS: Record<string, TaxBracket[]> = {
  QC: [
    { upTo: 51780, rate: 0.14 },
    { upTo: 103545, rate: 0.19 },
    { upTo: 126285, rate: 0.24 },
    { upTo: Infinity, rate: 0.2575 },
  ],
  ON: [
    { upTo: 51446, rate: 0.0505 },
    { upTo: 102894, rate: 0.0915 },
    { upTo: 150000, rate: 0.1116 },
    { upTo: 220000, rate: 0.1216 },
    { upTo: Infinity, rate: 0.1316 },
  ],
  AB: [
    { upTo: 148269, rate: 0.10 },
    { upTo: 177922, rate: 0.12 },
    { upTo: 237230, rate: 0.13 },
    { upTo: 355845, rate: 0.14 },
    { upTo: Infinity, rate: 0.15 },
  ],
  BC: [
    { upTo: 47937, rate: 0.0506 },
    { upTo: 95875, rate: 0.077 },
    { upTo: 110076, rate: 0.105 },
    { upTo: 133664, rate: 0.1229 },
    { upTo: 181232, rate: 0.147 },
    { upTo: 252752, rate: 0.168 },
    { upTo: Infinity, rate: 0.205 },
  ],
};

// Taux forfaitaire approximatif utilisé pour les provinces sans barème détaillé
// ci-dessus. L'interface l'indique clairement comme une estimation.
export const CA_PROVINCIAL_FALLBACK_RATE = 0.12;

export function computeBracketTax(annualIncome: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let lower = 0;
  for (const bracket of brackets) {
    if (annualIncome <= lower) break;
    const taxableInBracket = Math.min(annualIncome, bracket.upTo) - lower;
    tax += taxableInBracket * bracket.rate;
    lower = bracket.upTo;
  }
  return tax;
}

export const CANADIAN_REGIONS: TaxRegion[] = [
  { code: 'QC', nameFR: 'Québec', nameEN: 'Quebec', taxRate1: 0.05, taxRate2: 0.09975, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'TVQ (9.975%)', taxRate2NameEN: 'QST (9.975%)' },
  { code: 'ON', nameFR: 'Ontario', nameEN: 'Ontario', taxRate1: 0.13, taxRate2: 0.0, taxRate1NameFR: 'TVH (13%)', taxRate1NameEN: 'HST (13%)', taxRate2NameFR: 'Taxe locale', taxRate2NameEN: 'Local tax' },
  { code: 'BC', nameFR: 'Colombie-Britannique', nameEN: 'British Columbia', taxRate1: 0.05, taxRate2: 0.07, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'TVP (7%)', taxRate2NameEN: 'PST (7%)' },
  { code: 'AB', nameFR: 'Alberta', nameEN: 'Alberta', taxRate1: 0.05, taxRate2: 0.0, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'Pas de TVP', taxRate2NameEN: 'No PST' },
  { code: 'SK', nameFR: 'Saskatchewan', nameEN: 'Saskatchewan', taxRate1: 0.05, taxRate2: 0.06, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'TVP (6%)', taxRate2NameEN: 'PST (6%)' },
  { code: 'MB', nameFR: 'Manitoba', nameEN: 'Manitoba', taxRate1: 0.05, taxRate2: 0.07, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'TVP (7%)', taxRate2NameEN: 'PST (7%)' },
  { code: 'NB', nameFR: 'Nouveau-Brunswick', nameEN: 'New Brunswick', taxRate1: 0.15, taxRate2: 0.0, taxRate1NameFR: 'TVH (15%)', taxRate1NameEN: 'HST (15%)', taxRate2NameFR: 'Taxe locale', taxRate2NameEN: 'Local tax' },
  { code: 'NS', nameFR: 'Nouvelle-Écosse', nameEN: 'Nova Scotia', taxRate1: 0.15, taxRate2: 0.0, taxRate1NameFR: 'TVH (15%)', taxRate1NameEN: 'HST (15%)', taxRate2NameFR: 'Taxe locale', taxRate2NameEN: 'Local tax' },
  { code: 'PE', nameFR: 'Île-du-Prince-Édouard', nameEN: 'Prince Edward Island', taxRate1: 0.15, taxRate2: 0.0, taxRate1NameFR: 'TVH (15%)', taxRate1NameEN: 'HST (15%)', taxRate2NameFR: 'Taxe locale', taxRate2NameEN: 'Local tax' },
  { code: 'NL', nameFR: 'Terre-Neuve-et-Labrador', nameEN: 'Newfoundland and Labrador', taxRate1: 0.15, taxRate2: 0.0, taxRate1NameFR: 'TVH (15%)', taxRate1NameEN: 'HST (15%)', taxRate2NameFR: 'Taxe locale', taxRate2NameEN: 'Local tax' },
  { code: 'YT', nameFR: 'Yukon', nameEN: 'Yukon', taxRate1: 0.05, taxRate2: 0.0, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'Pas de TVP', taxRate2NameEN: 'No PST' },
  { code: 'NT', nameFR: 'Territoires du Nord-Ouest', nameEN: 'Northwest Territories', taxRate1: 0.05, taxRate2: 0.0, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'Pas de TVP', taxRate2NameEN: 'No PST' },
  { code: 'NU', nameFR: 'Nunavut', nameEN: 'Nunavut', taxRate1: 0.05, taxRate2: 0.0, taxRate1NameFR: 'TPS (5%)', taxRate1NameEN: 'GST (5%)', taxRate2NameFR: 'Pas de TVP', taxRate2NameEN: 'No PST' },
];

export const US_REGIONS: TaxRegion[] = [
  { code: 'AL', nameFR: 'Alabama', nameEN: 'Alabama', taxRate1: 0.0, taxRate2: 0.04, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4%)', taxRate2NameEN: 'State Tax (4%)' },
  { code: 'AK', nameFR: 'Alaska', nameEN: 'Alaska', taxRate1: 0.0, taxRate2: 0.0, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (0%)', taxRate2NameEN: 'State Tax (0%)' },
  { code: 'AZ', nameFR: 'Arizona', nameEN: 'Arizona', taxRate1: 0.0, taxRate2: 0.056, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5.6%)', taxRate2NameEN: 'State Tax (5.6%)' },
  { code: 'AR', nameFR: 'Arkansas', nameEN: 'Arkansas', taxRate1: 0.0, taxRate2: 0.065, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.5%)', taxRate2NameEN: 'State Tax (6.5%)' },
  { code: 'CA', nameFR: 'Californie', nameEN: 'California', taxRate1: 0.0, taxRate2: 0.0725, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (7.25%)', taxRate2NameEN: 'State Tax (7.25%)' },
  { code: 'CO', nameFR: 'Colorado', nameEN: 'Colorado', taxRate1: 0.0, taxRate2: 0.029, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (2.9%)', taxRate2NameEN: 'State Tax (2.9%)' },
  { code: 'CT', nameFR: 'Connecticut', nameEN: 'Connecticut', taxRate1: 0.0, taxRate2: 0.0635, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.35%)', taxRate2NameEN: 'State Tax (6.35%)' },
  { code: 'DE', nameFR: 'Delaware', nameEN: 'Delaware', taxRate1: 0.0, taxRate2: 0.0, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (0%)', taxRate2NameEN: 'State Tax (0%)' },
  { code: 'DC', nameFR: 'District de Columbia', nameEN: 'District of Columbia', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe de district (6%)', taxRate2NameEN: 'District Tax (6%)' },
  { code: 'FL', nameFR: 'Floride', nameEN: 'Florida', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'GA', nameFR: 'Géorgie', nameEN: 'Georgia', taxRate1: 0.0, taxRate2: 0.04, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4%)', taxRate2NameEN: 'State Tax (4%)' },
  { code: 'HI', nameFR: 'Hawaï', nameEN: 'Hawaii', taxRate1: 0.0, taxRate2: 0.04, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4%)', taxRate2NameEN: 'State Tax (4%)' },
  { code: 'ID', nameFR: 'Idaho', nameEN: 'Idaho', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'IL', nameFR: 'Illinois', nameEN: 'Illinois', taxRate1: 0.0, taxRate2: 0.0625, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.25%)', taxRate2NameEN: 'State Tax (6.25%)' },
  { code: 'IN', nameFR: 'Indiana', nameEN: 'Indiana', taxRate1: 0.0, taxRate2: 0.07, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (7%)', taxRate2NameEN: 'State Tax (7%)' },
  { code: 'IA', nameFR: 'Iowa', nameEN: 'Iowa', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'KS', nameFR: 'Kansas', nameEN: 'Kansas', taxRate1: 0.0, taxRate2: 0.065, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.5%)', taxRate2NameEN: 'State Tax (6.5%)' },
  { code: 'KY', nameFR: 'Kentucky', nameEN: 'Kentucky', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'LA', nameFR: 'Louisiane', nameEN: 'Louisiana', taxRate1: 0.0, taxRate2: 0.0445, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4.45%)', taxRate2NameEN: 'State Tax (4.45%)' },
  { code: 'ME', nameFR: 'Maine', nameEN: 'Maine', taxRate1: 0.0, taxRate2: 0.055, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5.5%)', taxRate2NameEN: 'State Tax (5.5%)' },
  { code: 'MD', nameFR: 'Maryland', nameEN: 'Maryland', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'MA', nameFR: 'Massachusetts', nameEN: 'Massachusetts', taxRate1: 0.0, taxRate2: 0.0625, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.25%)', taxRate2NameEN: 'State Tax (6.25%)' },
  { code: 'MI', nameFR: 'Michigan', nameEN: 'Michigan', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'MN', nameFR: 'Minnesota', nameEN: 'Minnesota', taxRate1: 0.0, taxRate2: 0.06875, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.875%)', taxRate2NameEN: 'State Tax (6.875%)' },
  { code: 'MS', nameFR: 'Mississippi', nameEN: 'Mississippi', taxRate1: 0.0, taxRate2: 0.07, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (7%)', taxRate2NameEN: 'State Tax (7%)' },
  { code: 'MO', nameFR: 'Missouri', nameEN: 'Missouri', taxRate1: 0.0, taxRate2: 0.04225, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4.225%)', taxRate2NameEN: 'State Tax (4.225%)' },
  { code: 'MT', nameFR: 'Montana', nameEN: 'Montana', taxRate1: 0.0, taxRate2: 0.0, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (0%)', taxRate2NameEN: 'State Tax (0%)' },
  { code: 'NE', nameFR: 'Nebraska', nameEN: 'Nebraska', taxRate1: 0.0, taxRate2: 0.055, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5.5%)', taxRate2NameEN: 'State Tax (5.5%)' },
  { code: 'NV', nameFR: 'Nevada', nameEN: 'Nevada', taxRate1: 0.0, taxRate2: 0.0685, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.85%)', taxRate2NameEN: 'State Tax (6.85%)' },
  { code: 'NH', nameFR: 'New Hampshire', nameEN: 'New Hampshire', taxRate1: 0.0, taxRate2: 0.0, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (0%)', taxRate2NameEN: 'State Tax (0%)' },
  { code: 'NJ', nameFR: 'New Jersey', nameEN: 'New Jersey', taxRate1: 0.0, taxRate2: 0.06625, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.625%)', taxRate2NameEN: 'State Tax (6.625%)' },
  { code: 'NM', nameFR: 'Nouveau-Mexique', nameEN: 'New Mexico', taxRate1: 0.0, taxRate2: 0.05125, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5.125%)', taxRate2NameEN: 'State Tax (5.125%)' },
  { code: 'NY', nameFR: 'New York', nameEN: 'New York', taxRate1: 0.0, taxRate2: 0.04, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4%)', taxRate2NameEN: 'State Tax (4%)' },
  { code: 'NC', nameFR: 'Caroline du Nord', nameEN: 'North Carolina', taxRate1: 0.0, taxRate2: 0.0475, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4.75%)', taxRate2NameEN: 'State Tax (4.75%)' },
  { code: 'ND', nameFR: 'Dakota du Nord', nameEN: 'North Dakota', taxRate1: 0.0, taxRate2: 0.05, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5%)', taxRate2NameEN: 'State Tax (5%)' },
  { code: 'OH', nameFR: 'Ohio', nameEN: 'Ohio', taxRate1: 0.0, taxRate2: 0.0575, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5.75%)', taxRate2NameEN: 'State Tax (5.75%)' },
  { code: 'OK', nameFR: 'Oklahoma', nameEN: 'Oklahoma', taxRate1: 0.0, taxRate2: 0.045, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4.5%)', taxRate2NameEN: 'State Tax (4.5%)' },
  { code: 'OR', nameFR: 'Oregon', nameEN: 'Oregon', taxRate1: 0.0, taxRate2: 0.0, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (0%)', taxRate2NameEN: 'State Tax (0%)' },
  { code: 'PA', nameFR: 'Pennsylvanie', nameEN: 'Pennsylvania', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'RI', nameFR: 'Rhode Island', nameEN: 'Rhode Island', taxRate1: 0.0, taxRate2: 0.07, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (7%)', taxRate2NameEN: 'State Tax (7%)' },
  { code: 'SC', nameFR: 'Caroline du Sud', nameEN: 'South Carolina', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'SD', nameFR: 'Dakota du Sud', nameEN: 'South Dakota', taxRate1: 0.0, taxRate2: 0.042, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4.2%)', taxRate2NameEN: 'State Tax (4.2%)' },
  { code: 'TN', nameFR: 'Tennessee', nameEN: 'Tennessee', taxRate1: 0.0, taxRate2: 0.07, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (7%)', taxRate2NameEN: 'State Tax (7%)' },
  { code: 'TX', nameFR: 'Texas', nameEN: 'Texas', taxRate1: 0.0, taxRate2: 0.0625, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.25%)', taxRate2NameEN: 'State Tax (6.25%)' },
  { code: 'UT', nameFR: 'Utah', nameEN: 'Utah', taxRate1: 0.0, taxRate2: 0.061, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.1%)', taxRate2NameEN: 'State Tax (6.1%)' },
  { code: 'VT', nameFR: 'Vermont', nameEN: 'Vermont', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'VA', nameFR: 'Virginie', nameEN: 'Virginia', taxRate1: 0.0, taxRate2: 0.053, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5.3%)', taxRate2NameEN: 'State Tax (5.3%)' },
  { code: 'WA', nameFR: 'Washington', nameEN: 'Washington', taxRate1: 0.0, taxRate2: 0.065, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6.5%)', taxRate2NameEN: 'State Tax (6.5%)' },
  { code: 'WV', nameFR: 'Virginie-Occidentale', nameEN: 'West Virginia', taxRate1: 0.0, taxRate2: 0.06, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (6%)', taxRate2NameEN: 'State Tax (6%)' },
  { code: 'WI', nameFR: 'Wisconsin', nameEN: 'Wisconsin', taxRate1: 0.0, taxRate2: 0.05, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (5%)', taxRate2NameEN: 'State Tax (5%)' },
  { code: 'WY', nameFR: 'Wyoming', nameEN: 'Wyoming', taxRate1: 0.0, taxRate2: 0.04, taxRate1NameFR: 'Pas de taxe Fédérale', taxRate1NameEN: 'No Federal Sales Tax', taxRate2NameFR: 'Taxe État (4%)', taxRate2NameEN: 'State Tax (4%)' },
];
