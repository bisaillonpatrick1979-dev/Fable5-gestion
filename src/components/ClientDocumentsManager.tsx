import React, { useState, useRef } from 'react';
import useAppStore from '../store';
import { 
  GCPDocument, GCPDocumentLineItem, GCPDocumentMaterialLine, 
  GCPDocumentLabourLine, GCPDocumentOtherLine, GCPDocumentSubcontractLine,
  GCPDocumentPaymentHistoryEntry
} from '../types';
import {
  Plus, Search, FileText, Trash2, Edit2, CheckCircle, Calendar,
  DollarSign, AlertCircle, TrendingUp, Briefcase, ShieldCheck,
  FileCheck, PenTool, Printer, ArrowRight, History, User, MapPin,
  CreditCard, X, ChevronDown, Check, Coins, Layers, HardHat
} from 'lucide-react';
import { CANADIAN_REGIONS, US_REGIONS, regionWithPreposition } from '../regionsData';
import SignaturePad from './SignaturePad';

export default function ClientDocumentsManager() {
  const {
    documents, addGCPDocument, updateGCPDocument, deleteGCPDocument,
    convertQuoteToInvoice, addPartialPayment, clients, projects, companyInfo,
    currentTheme, currentLanguage
  } = useAppStore();

  const companyCountry = companyInfo.country || 'CA';
  const companyRegion = (companyCountry === 'US' ? US_REGIONS : CANADIAN_REGIONS).find(r => r.code === companyInfo.region) || CANADIAN_REGIONS[0];
  const isQuebec = companyCountry === 'CA' && companyRegion.code === 'QC';
  const regionName = currentLanguage === 'FR' ? companyRegion.nameFR : companyRegion.nameEN;

  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'invoice' | 'quote' | 'contract'>('all');
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'paid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedDocForView, setSelectedDocForView] = useState<GCPDocument | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null); // docId

  // Payment capture form state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cheque' | 'etransfer' | 'virement' | 'cash'>('etransfer');
  const [payNotes, setPayNotes] = useState('');

  // Clause presets for insertion
  const clausePresets = {
    changeOrder: "Toute modification ou travaux additionnels feront l'objet d'un avenant écrit (Ordre de changement) décrivant les coûts additionnels et les impacts sur l'échéancier global, dûment signé par les deux parties avant l'exécution.",
    resiliation: "En cas de résiliation volontaire par le client par simple avis écrit, l'acompte de signature de 25% sera intégralement conservé par l'entrepreneur à titre de dommages-intérêts fixes pour couvrir les frais de dossier, de logistique et d'ingénierie.",
    warranty: "L'entrepreneur garantit la pose mécanique du revêtement extérieur pour une période de 10 ans selon la norme de l'AEPQ. La garantie du fabricant s'applique séparément sur les matériaux.",
    holdback: "Retenue de garantie contractuelle limitée à un maximum de 10% de la valeur des travaux en vertu de la loi sur le privilège de construction, libérable 45 jours après la réception finale de l'ouvrage sans réserve."
  };

  // Create Document States
  const [newDocType, setNewDocType] = useState<'invoice' | 'quote' | 'contract'>('quote');
  const [newClientId, setNewClientId] = useState('');
  const [newIsSimple, setNewIsSimple] = useState(true);
  const [newDueDate, setNewDueDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Simple lines form list
  const [simpleLines, setSimpleLines] = useState<Array<{ desc: string; qty: number; unit: string; price: number }>>([
    { desc: 'Fourniture et pose de revêtement extérieur', qty: 1, unit: 'forfait', price: 5000 }
  ]);

  // Rich lines lists
  const [richMaterials, setRichMaterials] = useState<Array<{ claddingType: string; brand: string; thickness: string; qtySqft: number; supplier: string; price: number }>>([]);
  const [richLabours, setRichLabours] = useState<Array<{ task: string; hours: number; rate: number; isFlat: boolean }>>([]);
  const [richOthers, setRichOthers] = useState<Array<{ desc: string; amount: number }>>([]);
  const [richSubcontracts, setRichSubcontracts] = useState<Array<{ companyName: string; phone: string; workType: string; amount: number }>>([]);

  // Holdbacks and discounts
  const [discountPct, setDiscountPct] = useState(0);
  const [holdbackPct, setHoldbackPct] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  
  // Schedules
  const [depositPct, setDepositPct] = useState(25);
  const [midPct, setMidPct] = useState(25);
  const [finalPct, setFinalPct] = useState(50);

  // Warranty
  const [warrantyYears, setWarrantyYears] = useState(companyInfo.defaultWarrantyYears ?? 2);
  const [hasInsurance, setHasInsurance] = useState(true);
  const [subcontractAuthorized, setSubcontractAuthorized] = useState(true);

  // Contract specific clauses
  const [clauseChange, setClauseChange] = useState(companyInfo.defaultClauseChangeOrder ?? clausePresets.changeOrder);
  const [clauseResil, setClauseResil] = useState(companyInfo.defaultClauseResiliation ?? clausePresets.resiliation);
  const [clauseWarr, setClauseWarr] = useState(clausePresets.warranty);

  // Tactile (touch-drawn) electronic signatures
  const [ownerSignatureData, setOwnerSignatureData] = useState<string | null>(null);
  const [clientSignatureData, setClientSignatureData] = useState<string | null>(null);
  const [signaturePadResetKey, setSignaturePadResetKey] = useState(0);

  const resetCreateForm = () => {
    setNewDocType('quote');
    setNewClientId(clients[0]?.id || '');
    setNewIsSimple(true);
    setNewDueDate(new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0]);
    setRemarks('');
    setSimpleLines([{ desc: 'Fourniture et pose de revêtement extérieur', qty: 1, unit: 'forfait', price: 5000 }]);
    setRichMaterials([]);
    setRichLabours([]);
    setRichOthers([]);
    setRichSubcontracts([]);
    setDiscountPct(0);
    setHoldbackPct(0);
    setDepositAmount(0);
    setDepositPct(25);
    setMidPct(25);
    setFinalPct(50);
    setWarrantyYears(companyInfo.defaultWarrantyYears ?? 2);
    setHasInsurance(true);
    setSubcontractAuthorized(true);
    setClauseChange(companyInfo.defaultClauseChangeOrder ?? clausePresets.changeOrder);
    setClauseResil(companyInfo.defaultClauseResiliation ?? clausePresets.resiliation);
    setClauseWarr(clausePresets.warranty);
    setOwnerSignatureData(null);
    setClientSignatureData(null);
    setSignaturePadResetKey(k => k + 1);
  };

  const handleCreateDocument = () => {
    const cli = clients.find(c => c.id === newClientId) || clients[0];
    if (!cli) {
      alert("Veuillez sélectionner un client d'abord ou en ajouter un dans les Réglages.");
      return;
    }

    if (!ownerSignatureData) {
      alert("La signature tactile de l'entrepreneur est requise avant de générer ce document.");
      return;
    }
    if (newDocType === 'contract' && !clientSignatureData) {
      alert("La signature tactile du client est requise pour générer une entente/contrat.");
      return;
    }

    // Format Simple lines
    const lineItems: GCPDocumentLineItem[] = simpleLines.map((l, idx) => ({
      id: `li-${Date.now()}-${idx}`,
      description: l.desc,
      qty: Number(l.qty) || 0,
      unit: l.unit,
      unitPrice: Number(l.price) || 0,
      total: Number(((l.qty || 0) * (l.price || 0)).toFixed(2))
    }));

    // Format Rich lines
    const materialLines: GCPDocumentMaterialLine[] = richMaterials.map((m, idx) => ({
      id: `m-${Date.now()}-${idx}`,
      claddingType: m.claddingType,
      brand: m.brand,
      thickness: m.thickness,
      qtySqft: Number(m.qtySqft) || 0,
      supplier: m.supplier,
      unitPrice: Number(m.price) || 0,
      total: Number(((m.qtySqft || 0) * (m.price || 0)).toFixed(2))
    }));

    const labourLines: GCPDocumentLabourLine[] = richLabours.map((lb, idx) => ({
      id: `lb-${Date.now()}-${idx}`,
      task: lb.task,
      estimatedHours: Number(lb.hours) || 0,
      rate: Number(lb.rate) || 0,
      isFlatRate: lb.isFlat,
      total: lb.isFlat ? (Number(lb.rate) || 0) : Number(((lb.hours || 0) * (lb.rate || 0)).toFixed(2))
    }));

    const otherLines: GCPDocumentOtherLine[] = richOthers.map((o, idx) => ({
      id: `o-${Date.now()}-${idx}`,
      description: o.desc,
      amount: Number(o.amount) || 0
    }));

    const subcontractLines: GCPDocumentSubcontractLine[] = richSubcontracts.map((s, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      companyName: s.companyName,
      phone: s.phone,
      workType: s.workType,
      amount: Number(s.amount) || 0
    }));

    addGCPDocument({
      type: newDocType,
      date: new Date().toISOString().split('T')[0],
      dueDate: newDueDate,
      status: 'draft',
      clientId: cli.id,
      clientName: cli.name,
      clientAddress: cli.address,
      clientEmail: cli.email,
      clientPhone: cli.phone,
      siteAddress: cli.address,
      isSimpleLayout: newIsSimple,
      lineItems,
      materialLines,
      labourLines,
      otherLines,
      subcontractLines,
      subtotal: 0, // Auto calculated in store
      discountPct: Number(discountPct) || 0,
      taxRate: Number((((companyInfo.taxRate1 !== undefined ? companyInfo.taxRate1 : 0.05) + (companyInfo.taxRate2 !== undefined ? companyInfo.taxRate2 : 0.09975)) * 100).toFixed(4)),
      taxAmount: 0, // Auto calculated
      total: 0, // Auto calculated
      holdbackPct: Number(holdbackPct) || 0,
      holdbackAmount: 0, // Auto calculated
      depositAmount: Number(depositAmount) || 0,
      balanceDue: 0, // Auto calculated
      acceptedPayments: ['virement', 'etransfer'],
      lateInterestPct: 2,
      depositPct,
      paymentMidPct: midPct,
      paymentFinalPct: finalPct,
      quoteValidDays: 30,
      permitBy: 'contractor',
      warrantyYears,
      hasInsurance,
      subcontractAuthorized,
      contractObject: remarks || `Remplacement et pose méticuleuse du revêtement extérieur chez ${cli.name}.`,
      clauseChangeOrder: clauseChange,
      clauseResiliation: clauseResil,
      clauseWarrantyDetails: clauseWarr,
      ownerName: companyInfo.name || 'Votre Entreprise Inc.',
      paymentsHistory: [],
      clientSignature: newDocType === 'contract' ? (clientSignatureData || undefined) : undefined,
      ownerSignature: ownerSignatureData || undefined,
      signedAt: new Date().toISOString()
    });

    setShowCreateModal(false);
    resetCreateForm();
  };

  const handleCapturePayment = (docId: string) => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant supérieur à 0 $.");
      return;
    }
    
    addPartialPayment(docId, amount, payMethod, payNotes);
    
    // Update local preview state
    const currentDoc = documents.find(d => d.id === docId);
    if (currentDoc) {
      // Re-trigger visual preview synchronicity
      const updatedHistory = [...(currentDoc.paymentsHistory || []), {
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount,
        method: payMethod,
        notes: payNotes || 'Paiement partiel enregistré'
      }];
      const totalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
      const newBalance = Number((currentDoc.total - currentDoc.holdbackAmount - totalPaid).toFixed(2));
      setSelectedDocForView({
        ...currentDoc,
        paymentsHistory: updatedHistory,
        balanceDue: newBalance,
        status: newBalance <= 0 ? 'paid' : currentDoc.status
      });
    }

    setShowPaymentModal(null);
    setPayAmount('');
    setPayNotes('');
  };

  // PDF Preview printing simulations
  const handlePrint = () => {
    window.print();
  };

  // Filters calculation
  const filteredDocs = documents.filter(doc => {
    const matchesType = activeTypeTab === 'all' || doc.type === activeTypeTab;
    const matchesStatus = activeStatusTab === 'all' || doc.status === activeStatusTab;
    const matchesSearch = 
      doc.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.refQuote && doc.refQuote.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  // Aggregated totals
  const totalReceivables = documents
    .filter(d => d.type === 'invoice' && d.status !== 'paid')
    .reduce((sum, d) => sum + d.balanceDue, 0);

  const totalQuotesAccepted = documents
    .filter(d => d.type === 'quote' && d.status === 'accepted')
    .reduce((sum, d) => sum + d.total, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-800 text-gray-300 border-gray-700';
      case 'sent': return 'bg-blue-950/40 text-blue-400 border-blue-900/30';
      case 'accepted': return 'bg-purple-950/40 text-purple-400 border-purple-900/30';
      case 'paid': return 'bg-green-950/40 text-green-400 border-green-900/30';
      case 'overdue': return 'bg-red-950/40 text-red-400 border-red-900/30';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'sent': return 'Envoyé';
      case 'accepted': return 'Accepté 🤝';
      case 'paid': return 'Payé ✔️';
      case 'overdue': return 'Retard ⚠️';
      default: return status;
    }
  };

  const getThemeTextGlow = () => {
    switch (currentTheme) {
      case 'quantum': return 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]';
      case 'xp': return 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]';
      case 'deco': return 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]';
      case 'inferno': return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]';
      case 'arctic': return 'text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.4)]';
      default: return 'text-orange-500';
    }
  };

  return (
    <div id="clients-documents-manager" className="space-y-6">
      
      {/* 🌟 STATS OVERVIEW DECK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-[#12131A] border border-gray-850 p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-2 right-2 p-1.5 bg-gray-900 text-cyan-400 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider block">Recevables Clients</span>
          <p className="text-xl font-black text-white mt-1">{totalReceivables.toLocaleString('fr-CA')}$</p>
          <p className="text-[10px] text-gray-400 mt-1">Factures émises non payées</p>
        </div>

        <div className="bg-[#12131A] border border-gray-850 p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-2 right-2 p-1.5 bg-gray-900 text-purple-400 rounded-lg">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider block">Devis Signés</span>
          <p className="text-xl font-black text-white mt-1">{totalQuotesAccepted.toLocaleString('fr-CA')}$</p>
          <p className="text-[10px] text-gray-400 mt-1">Devis approuvés prêts à facturer</p>
        </div>

        <div className="bg-[#12131A] border border-gray-850 p-4 rounded-xl relative overflow-hidden col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest font-black">Numérotation Automatique{isQuebec ? ' CCQ' : ''}</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed max-w-sm">
            {isQuebec
              ? "Numérotation séquentielle québécoise homologuée pour l'assurance qualité et le suivi diligent des inspections APCHQ/CCQ."
              : `Numérotation séquentielle homologuée pour l'assurance qualité et le suivi diligent des documents ${regionWithPreposition(companyRegion, companyCountry)}.`}
          </p>
        </div>

      </div>

      {/* 🔍 FILTER BAR */}
      <div className="bg-[#12131A] border border-gray-850 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Main search and new create button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par N° de pièce ou client..."
                className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau document client</span>
            </button>
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'quote', label: 'Devis (Soumissions)' },
              { id: 'contract', label: 'Contrats Travaux' },
              { id: 'invoice', label: 'Factures Clients' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition duration-200 cursor-pointer ${
                  activeTypeTab === tab.id
                    ? 'bg-orange-600 border-orange-500 text-white'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Status sub filters */}
        <div className="flex flex-wrap items-center gap-1 border-t border-gray-800 pt-3">
          <span className="text-[10px] uppercase font-mono tracking-wide text-gray-500 mr-2">Filtrer Statut :</span>
          {[
            { id: 'all', label: 'Tous' },
            { id: 'draft', label: 'Brouillon' },
            { id: 'sent', label: 'Envoyé' },
            { id: 'accepted', label: 'Accepté 🤝' },
            { id: 'paid', label: 'Payé' },
            { id: 'overdue', label: 'Retard' }
          ].map(stat => (
            <button
              key={stat.id}
              onClick={() => setActiveStatusTab(stat.id as any)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition cursor-pointer ${
                activeStatusTab === stat.id
                  ? 'bg-gray-800 border-gray-700 text-white font-black'
                  : 'bg-gray-900/40 border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {stat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📋 DOCUMENT GRID / LIST */}
      <div id="document-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="p-8 bg-gray-900/40 border border-gray-850 rounded-2xl text-center md:col-span-2">
            <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Aucun document client correspondant aux filtres trouvés.</p>
          </div>
        ) : (
          filteredDocs.map(doc => (
            <div 
              key={doc.id}
              className="bg-[#12131A] hover:bg-[#151722] border border-gray-850 hover:border-gray-800 rounded-xl p-4 flex flex-col justify-between gap-4 transition duration-200"
            >
              
              {/* Header inside row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-white">{doc.number}</span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold bg-gray-900 text-gray-400">
                      {doc.type === 'quote' ? 'DEV' : doc.type === 'contract' ? 'CON' : 'FAC'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white max-w-[220px] truncate">{doc.clientName}</h4>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Émis le {doc.date} | Échéance {doc.dueDate}</span>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(doc.status)}`}>
                    {getStatusTranslation(doc.status)}
                  </span>
                  {doc.refQuote && (
                    <p className="text-[9px] text-blue-400 font-mono">Quotes Ref: {doc.refQuote}</p>
                  )}
                </div>
              </div>

              {/* Items summary and pricing */}
              <div className="bg-gray-950/40 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-center text-xs border border-gray-850">
                <div>
                  <span className="text-[10px] text-gray-500 font-mono">Sous-total</span>
                  <p className="font-bold text-white mt-0.5">{doc.subtotal.toFixed(2)}$</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-mono">Taxes (TTC)</span>
                  <p className="font-bold text-white mt-0.5">{doc.total.toFixed(2)}$</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-mono text-orange-500">Dû</span>
                  <p className="font-black text-green-400 mt-0.5">{doc.balanceDue.toFixed(2)}$</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-gray-805 pt-3">
                <button
                  onClick={() => deleteGCPDocument(doc.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 border border-transparent hover:border-red-950 hover:bg-red-950/20 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  
                  {/* Convert quote option */}
                  {doc.type === 'quote' && doc.status === 'accepted' && (
                    <button
                      onClick={() => {
                        convertQuoteToInvoice(doc.id);
                        alert(`Le devis ${doc.number} a été converti avec succès en Facture client !`);
                      }}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>Convertir en Facture</span>
                    </button>
                  )}

                  {/* Accept quote action direct */}
                  {doc.type === 'quote' && doc.status === 'sent' && (
                    <button
                      onClick={() => {
                        updateGCPDocument({ ...doc, status: 'accepted' });
                      }}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Approuver (Accepté)</span>
                    </button>
                  )}

                  {/* Send action */}
                  {doc.status === 'draft' && (
                    <button
                      onClick={() => {
                        updateGCPDocument({ ...doc, status: 'sent' });
                      }}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold uppercase rounded-lg transition"
                    >
                      Marquer Envoyé
                    </button>
                  )}

                  {/* Pay Ledger action */}
                  {doc.type === 'invoice' && doc.status !== 'paid' && (
                    <button
                      onClick={() => {
                        setPayAmount(doc.balanceDue.toString());
                        setShowPaymentModal(doc.id);
                      }}
                      className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3 h-3" />
                      <span>Enregistrer Paiement</span>
                    </button>
                  )}

                  {/* Open details modal */}
                  <button
                    onClick={() => setSelectedDocForView(doc)}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-neutral-200 hover:text-white text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Ouvrir PDF / Imprimer</span>
                  </button>

                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* 📄 MODAL: RICH VIEW & PRINTING COOP PREVIEW WITH THE WATERMARK SPEC */}
      {selectedDocForView && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white">
          <div className="bg-[#12141C] border border-gray-850 w-full max-w-4xl rounded-2xl p-6 relative max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:p-0 print:bg-white print:text-black">
            
            {/* Control panel buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-4 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-1 rounded bg-orange-600/10 text-orange-500 font-extrabold border border-orange-500/20">Aperçu Certifié APCHQ</span>
                <span className="text-xs text-gray-500 font-mono">Modif-Replication Synced</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg cursor-pointer transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer / Exporter PDF</span>
                </button>
                <button
                  onClick={() => setSelectedDocForView(null)}
                  className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 📜 ACTUAL DOCUMENT SHEET PREVIEW (WHITE SHEET LOOK FOR LEGIBILITY) */}
            <div 
              id="gcp-pdf-canvas" 
              className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl relative overflow-hidden font-sans border border-gray-200 select-all print:shadow-none print:border-none"
            >
              
              {/* Dynamic Logo Watermark & Diagonal text overlay (from improvements spec) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                {/* Angular watermark */}
                <div className="relative transform -rotate-12 opacity-[0.09] flex flex-col items-center justify-center">
                  <div className="w-72 h-72 border-8 border-slate-900 rounded-full flex items-center justify-center p-6 mix-blend-multiply">
                    <img 
                      src={companyInfo.logo || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=260&q=80"}
                      alt="Watermark Logo"
                      className="w-48 h-48 rounded-full object-cover grayscale"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Diagonal Type of document PAR-DESSUS exact diagonal overlay */}
                  <span className="absolute text-5xl font-mono font-black uppercase tracking-widest text-slate-900 mt-2 filter drop-shadow">
                    {selectedDocForView.status === 'paid' ? 'FACTURE PAYÉE' : 
                     selectedDocForView.status === 'accepted' ? 'DEVIS ACCEPTÉ' : 
                     selectedDocForView.type === 'quote' ? 'DEVIS PROJECTION' : 
                     selectedDocForView.type === 'contract' ? 'ENTENTE CONTRAT' : 'FACTURE SOLDE'}
                  </span>
                </div>
              </div>

              {/* Real PDF Sheet Content structure */}
              <div className="relative z-10 space-y-6">
                
                {/* Header row */}
                <div className="flex justify-between items-start gap-4 border-b border-slate-250 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center font-bold text-white text-xl">H</div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase leading-none tracking-tighter">{companyInfo.name || "VOTRE ENTREPRISE"}</h2>
                        <span className="text-[9px] uppercase tracking-wider font-mono text-gray-500">Pose Professionnelle & Revêtement</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 font-mono">
                      {companyInfo.address || "1980 Boul. du Chantier, Montréal, QC"}<br />
                      Tél : {companyInfo.phone || "(514) 876-0000"} | Émail : {companyInfo.email || "info@votreentreprise.ca"}
                    </p>
                    <div className="text-[10px] text-gray-500 font-mono space-y-0.5 mt-1">
                      {companyInfo.gstNumber && <p>TPS / GST : {companyInfo.gstNumber}</p>}
                      {companyInfo.qstNumber && <p>TVQ / QST : {companyInfo.qstNumber}</p>}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-3xl font-black uppercase tracking-tight block text-slate-800">
                      {selectedDocForView.type === 'invoice' ? 'Facture' : selectedDocForView.type === 'quote' ? 'Devis' : 'Contrat'}
                    </span>
                    <p className="text-sm font-mono font-bold text-slate-900">{selectedDocForView.number}</p>
                    <p className="text-xs text-slate-500 font-mono">Émis le : {selectedDocForView.date}</p>
                    <p className="text-xs text-slate-500 font-mono">Échéance : <span className="font-bold text-red-600">{selectedDocForView.dueDate}</span></p>
                    {selectedDocForView.refQuote && (
                      <p className="text-[10px] text-blue-600 font-mono mt-1">Ref Devis : {selectedDocForView.refQuote}</p>
                    )}
                  </div>
                </div>

                {/* Client info segment */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-mono text-gray-400 block tracking-wider">Facturation Destinée à :</span>
                    <p className="font-bold text-sm text-slate-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedDocForView.clientName}</span>
                    </p>
                    <p className="text-xs text-slate-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{selectedDocForView.clientAddress}</span>
                    </p>
                    <p className="text-xs text-slate-600">Courriel : {selectedDocForView.clientEmail}</p>
                    <p className="text-xs text-slate-600">Tél : {selectedDocForView.clientPhone}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-mono text-gray-400 block tracking-wider">Adresse du Chantier :</span>
                    <p className="text-xs text-slate-800 font-semibold">{selectedDocForView.siteAddress || selectedDocForView.clientAddress}</p>
                    <div className="pt-2 text-[10px] text-slate-500">
                      <p>Règlement : {isQuebec ? 'Québec CCQ de Pose' : `Normes de construction — ${regionName}`}</p>
                      <p>Retenue légale admissible : {selectedDocForView.holdbackPct}%</p>
                    </div>
                  </div>
                </div>

                {/* Object description (Contracts) */}
                {selectedDocForView.type === 'contract' && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded text-xs">
                    <strong className="text-indigo-900 block font-mono uppercase text-[9px] tracking-wider">Objet de l\'entente :</strong>
                    <p className="text-slate-700 italic mt-1">"{selectedDocForView.contractObject || 'Remplacement complet du parement extérieur conformément au devis émis.'}"</p>
                  </div>
                )}

                {/* Items loop list table */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-mono font-black text-slate-400 tracking-wide block">Description détaillée des travaux & fournitures :</span>
                  
                  {selectedDocForView.isSimpleLayout ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-gray-500">
                          <th className="py-2">Travaux / Matériaux</th>
                          <th className="py-2 text-center w-16">Quantité</th>
                          <th className="py-2 text-center w-20">Unité</th>
                          <th className="py-2 text-right w-24">Prix Unit.</th>
                          <th className="py-2 text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedDocForView.lineItems.map(item => (
                          <tr key={item.id}>
                            <td className="py-2.5 font-medium text-slate-800">{item.description}</td>
                            <td className="py-2.5 text-center font-mono">{item.qty}</td>
                            <td className="py-2.5 text-center text-slate-500">{item.unit}</td>
                            <td className="py-2.5 text-right font-mono">{item.unitPrice.toFixed(2)}$</td>
                            <td className="py-2.5 text-right font-mono font-bold">{item.total.toFixed(2)}$</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Rich Layout categories block */
                    <div className="space-y-4">
                      
                      {/* Materials */}
                      {selectedDocForView.materialLines && selectedDocForView.materialLines.length > 0 && (
                        <div className="space-y-1.5 border border-slate-100 rounded-lg p-3">
                          <h5 className="text-[10px] font-black text-indigo-900 uppercase font-mono tracking-wider">Catégorie A : Fourniture Revêtements</h5>
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-indigo-100 text-slate-400 font-mono">
                                <th className="py-1">Type de parement & Marque</th>
                                <th className="py-1 text-center w-16">Superficie</th>
                                <th className="py-1 text-right w-24">Prix Unit / pi²</th>
                                <th className="py-1 text-right w-24">Sous-total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {selectedDocForView.materialLines.map(m => (
                                <tr key={m.id}>
                                  <td className="py-1.5 text-slate-800 font-medium">
                                    {m.claddingType} — {m.brand} <span className="text-slate-400 font-normal">({m.thickness})</span>
                                  </td>
                                  <td className="py-1.5 text-center font-mono">{m.qtySqft} pi²</td>
                                  <td className="py-1.5 text-right font-mono">{m.unitPrice.toFixed(2)}$</td>
                                  <td className="py-1.5 text-right font-mono font-bold">{m.total.toFixed(2)}$</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Labor */}
                      {selectedDocForView.labourLines && selectedDocForView.labourLines.length > 0 && (
                        <div className="space-y-1.5 border border-slate-100 rounded-lg p-3">
                          <h5 className="text-[10px] font-black text-amber-950 uppercase font-mono tracking-wider">Catégorie B : Main-d'œuvre spécialisée{isQuebec ? ' CCQ' : ''}</h5>
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-amber-100 text-slate-400 font-mono">
                                <th className="py-1">Description tâche</th>
                                <th className="py-1 text-center w-16">Heures</th>
                                <th className="py-1 text-right w-24">Taux horaire / Forfait</th>
                                <th className="py-1 text-right w-24">Sous-total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {selectedDocForView.labourLines.map(lb => (
                                <tr key={lb.id}>
                                  <td className="py-1.5 text-slate-800 font-medium">{lb.task}</td>
                                  <td className="py-1.5 text-center font-mono">{lb.isFlatRate ? 'N/A' : lb.estimatedHours} h</td>
                                  <td className="py-1.5 text-right font-mono">{lb.rate.toFixed(2)}$ {lb.isFlatRate ? '(Fixe)' : '/h'}</td>
                                  <td className="py-1.5 text-right font-mono font-bold">{lb.total.toFixed(2)}$</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Equipment/Others */}
                      {selectedDocForView.otherLines && selectedDocForView.otherLines.length > 0 && (
                        <div className="space-y-1.5 border border-slate-100 rounded-lg p-3">
                          <h5 className="text-[10px] font-black text-teal-950 uppercase font-mono tracking-wider">Catégorie C : Frais de transport, nacelle & échafaudage</h5>
                          <div className="space-y-1 divide-y divide-slate-50 text-[11px]">
                            {selectedDocForView.otherLines.map(o => (
                              <div key={o.id} className="flex justify-between items-center py-1">
                                <span className="text-slate-800 font-medium">{o.description}</span>
                                <span className="font-mono font-bold">{o.amount.toFixed(2)}$</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Subledger partial payment history ledger box */}
                {selectedDocForView.paymentsHistory && selectedDocForView.paymentsHistory.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-black text-emerald-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Registre des paiements reçus (Acomptes & Virements)</span>
                    </h5>
                    
                    <div className="space-y-1 divide-y divide-emerald-100 text-xs">
                      {selectedDocForView.paymentsHistory.map((p, idx) => (
                        <div key={p.id || idx} className="flex justify-between items-center py-1.5">
                          <div>
                            <span className="font-bold text-slate-800">{p.date}</span>
                            <span className="text-slate-500 italic ml-2">({p.method.toUpperCase()} — {p.notes})</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-800">-{p.amount.toFixed(2)}$</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals summation card */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  
                  {/* Payment Terms Info */}
                  <div className="text-xs text-slate-500 space-y-2 self-start max-w-sm">
                    <p className="font-bold text-slate-900 font-mono text-[9px] uppercase tracking-wider">Conditions de paie réglementaires :</p>
                    <p>Frais d\'intérêt sur retard cumulatif de {selectedDocForView.lateInterestPct || 2}% par mois de retard.</p>
                    <p>Modes acceptés : Virement Interac, Chèque ou DEP électronique.</p>
                    <p className="text-[10px]">L\'acompte demandé est de {selectedDocForView.depositPct || 25}% à la signature de la présente entente de pose.</p>
                  </div>

                  {/* Calculations summary alignment */}
                  <div className="space-y-1.5 text-xs text-right pr-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Sous-total brut :</span>
                      <span className="font-mono">{selectedDocForView.subtotal.toFixed(2)}$</span>
                    </div>

                    {selectedDocForView.discountPct > 0 && (
                      <div className="flex justify-between items-center text-red-650">
                        <span className="text-slate-500">Escompte professionnel ({selectedDocForView.discountPct}%) :</span>
                        <span className="font-mono font-bold">-{ (selectedDocForView.subtotal * (selectedDocForView.discountPct / 100)).toFixed(2) }$</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">Taxes combinées ({selectedDocForView.taxRate}%) :</span>
                      <span className="font-mono">+{selectedDocForView.taxAmount.toFixed(2)}$</span>
                    </div>

                    <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
                      <span>Total général TTC :</span>
                      <span className="font-mono font-black">{selectedDocForView.total.toFixed(2)}$</span>
                    </div>

                    {selectedDocForView.holdbackPct > 0 && (
                      <div className="flex justify-between items-center text-amber-800">
                        <span>Retenue légale{isQuebec ? ' CCQ' : ''} ({selectedDocForView.holdbackPct}%) :</span>
                        <span className="font-mono font-semibold">-{selectedDocForView.holdbackAmount.toFixed(2)}$</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center font-black text-green-650 text-base border-t border-slate-205 pt-2">
                      <span className="text-slate-900">Solde exigible :</span>
                      <span className="font-mono text-green-600">{selectedDocForView.balanceDue.toFixed(2)}$ CAD</span>
                    </div>
                  </div>

                </div>

                {/* Contracts/Quotes: Dynamic legal clauses rendering */}
                {(selectedDocForView.type === 'contract' || selectedDocForView.type === 'quote') && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <h5 className="text-[10px] font-black text-slate-700 uppercase font-mono tracking-wider">ANNEXE A : Clauses légales & Conditions de pose Québécoises</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] text-slate-500">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                        <strong className="text-slate-800 block mb-1">Avenants de travaux :</strong>
                        <p className="leading-normal">{selectedDocForView.clauseChangeOrder || clausePresets.changeOrder}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                        <strong className="text-slate-800 block mb-1">Résiliation unilatérale :</strong>
                        <p className="leading-normal">{selectedDocForView.clauseResiliation || clausePresets.resiliation}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                        <strong className="text-slate-800 block mb-1">Garantie limitée :</strong>
                        <p className="leading-normal">{selectedDocForView.clauseWarrantyDetails || clausePresets.warranty}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signatures block */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
                  
                  {/* Signature Entrepreneur */}
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-mono text-gray-400 block tracking-wider">L'Entrepreneur (Signature tactile) :</span>
                    <div className="border border-slate-200 rounded p-3 h-14 flex items-center justify-center font-serif text-sm bg-slate-50">
                      {selectedDocForView.ownerSignature ? (
                        selectedDocForView.ownerSignature.startsWith('data:image') ? (
                          <img src={selectedDocForView.ownerSignature} alt="Signature de l'entrepreneur" className="h-full object-contain" />
                        ) : (
                          <span className="italic font-bold text-slate-800 select-none">
                            {selectedDocForView.ownerSignature.replace('typed://', '')}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 font-sans text-xs">Non signé numériquement</span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-slate-700">{companyInfo.name || 'Votre Entreprise Inc.'}</p>
                  </div>

                  {/* Signature Client */}
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-mono text-gray-400 block tracking-wider">Le Client (Signature tactile) :</span>
                    <div className="border border-slate-200 rounded p-3 h-14 flex items-center justify-center font-serif text-sm bg-slate-50">
                      {selectedDocForView.clientSignature ? (
                        selectedDocForView.clientSignature.startsWith('data:image') ? (
                          <img src={selectedDocForView.clientSignature} alt="Signature du client" className="h-full object-contain" />
                        ) : (
                          <span className="italic font-bold text-orange-600 select-none">
                            {selectedDocForView.clientSignature.replace('typed://', '')}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 font-sans text-xs">Non signé numériquement</span>
                      )}
                    </div>
                    {selectedDocForView.signedAt && (
                      <p className="text-[9px] text-gray-500 font-mono">Signé électroniquement le {new Date(selectedDocForView.signedAt).toLocaleDateString('fr-CA')}</p>
                    )}
                    <p className="text-[10px] font-semibold text-slate-700">{selectedDocForView.clientName}</p>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* 💳 MODAL: REGISTER PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#12141C] border border-gray-850 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white">Saisie de Paiement Partiel</h3>
              <button onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 block">Montant encaissé ($ CAD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-white font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="ex: 2500"
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 pl-7 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 block">Mode de paiement canadien</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 focus:outline-none cursor-pointer"
                >
                  <option value="etransfer">Virement Interac</option>
                  <option value="cheque">Chèque certifié</option>
                  <option value="virement">Dépôt Direct EFT / Direct</option>
                  <option value="cash">Comptant</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 block">Notes administratives</label>
                <textarea
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="ex: Acompte de démarrage reçu par virement bancaire"
                  className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 h-20 focus:outline-none text-xs"
                />
              </div>

              <button
                onClick={() => handleCapturePayment(showPaymentModal)}
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-wider rounded-lg transition mt-3"
              >
                Enregistrer & Mettre à jour le solde
              </button>

            </div>
          </div>
        </div>
      )}

      {/* 🏗️ MODAL: CREATE DOCUMENT (DEVIS / CONTRAT / FACTURE) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#12141C] border border-gray-850 w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[95vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white">Nouveau Document Client Générateur</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Type toggle */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'quote', title: '💬 DEVIS (SOUVENIR)' },
                  { id: 'contract', title: '✍️ CONTRAT DIRECT' },
                  { id: 'invoice', title: '💵 FACTURE FINALE' }
                ].map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setNewDocType(op.id as any)}
                    className={`py-2 text-center rounded-lg border font-black transition cursor-pointer ${
                      newDocType === op.id 
                        ? 'bg-orange-650 border-orange-500 text-white' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {op.title}
                  </button>
                ))}
              </div>

              {/* Client Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400">Sélectionner Client Régularisé</label>
                  <select
                    value={newClientId}
                    onChange={e => setNewClientId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 focus:outline-none cursor-pointer"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 font-mono">
                  <label className="text-gray-400">Date d\'échéance légale</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Layout layout option toggler */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400">Structure des Lignes :</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={newIsSimple} 
                    onChange={() => setNewIsSimple(true)}
                    className="accent-orange-500" 
                  />
                  <span>Simple ligne globale (Forfait)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={!newIsSimple} 
                    onChange={() => setNewIsSimple(false)}
                    className="accent-orange-500" 
                  />
                  <span>Détaillée (Matériaux, main d\'œuvre)</span>
                </label>
              </div>

              {/* Lignes inputs renderers */}
              {newIsSimple ? (
                /* Simple layout */
                <div className="space-y-2 border border-gray-800 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">Ligne forfaitaire principale :</span>
                  </div>
                  {simpleLines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                      <input
                        type="text"
                        value={l.desc}
                        onChange={e => {
                          const dup = [...simpleLines];
                          dup[idx].desc = e.target.value;
                          setSimpleLines(dup);
                        }}
                        placeholder="Description travaux..."
                        className="col-span-3 bg-gray-900 border border-gray-800 text-white rounded p-1.5 text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        value={l.qty}
                        onChange={e => {
                          const dup = [...simpleLines];
                          dup[idx].qty = Math.max(0, parseFloat(e.target.value) || 0);
                          setSimpleLines(dup);
                        }}
                        placeholder="Qty"
                        className="col-span-1 bg-gray-900 border border-gray-800 text-white rounded p-1.5 text-xs text-center"
                      />
                      <input
                        type="text"
                        value={l.unit}
                        onChange={e => {
                          const dup = [...simpleLines];
                          dup[idx].unit = e.target.value;
                          setSimpleLines(dup);
                        }}
                        placeholder="Unité"
                        className="col-span-1 bg-gray-900 border border-gray-800 text-white rounded p-1.5 text-xs text-center"
                      />
                      <input
                        type="number"
                        min="0"
                        value={l.price}
                        onChange={e => {
                          const dup = [...simpleLines];
                          dup[idx].price = Math.max(0, parseFloat(e.target.value) || 0);
                          setSimpleLines(dup);
                        }}
                        placeholder="$/unit"
                        className="col-span-2 bg-gray-900 border border-gray-800 text-white rounded p-1.5 text-xs text-right"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Rich detailed layout lists with direct controls */
                <div className="space-y-3 border border-gray-800 p-3 rounded-lg max-h-56 overflow-y-auto">
                  
                  {/* Cladding materials item creation */}
                  <div className="space-y-2 pb-2.5 border-b border-gray-805">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1">🛠️ Matériaux de parement ({richMaterials.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRichMaterials([...richMaterials, { claddingType: 'Fibre de ciment', brand: 'James Hardie', thickness: '5/16"', qtySqft: 250, supplier: 'Gentek', price: 8.5 }]);
                        }}
                        className="text-[10px] uppercase font-bold text-orange-500 hover:underline"
                      >
                        + Ajouter Revêtement
                      </button>
                    </div>

                    {richMaterials.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 bg-gray-900/60 p-2 rounded relative group">
                        <select
                          value={m.claddingType}
                          onChange={e => {
                            const d = [...richMaterials]; d[idx].claddingType = e.target.value; setRichMaterials(d);
                          }}
                          className="bg-gray-900 text-white text-[11px] p-1 rounded col-span-2 focus:outline-none"
                        >
                          <option value="Fibre de ciment">Fibre de ciment</option>
                          <option value="Bois d\'ingénierie">Bois d\'ingénierie (LP)</option>
                          <option value="Vinyle Premium">Vinyle Premium</option>
                          <option value="Acier Rustique">Acier Rustique</option>
                        </select>
                        <input
                          type="text" value={m.brand} placeholder="Marque"
                          onChange={e => { const d = [...richMaterials]; d[idx].brand = e.target.value; setRichMaterials(d); }}
                          className="bg-gray-900 border border-gray-850 text-white text-[11px] p-1 rounded font-mono"
                        />
                        <input
                          type="number" min="0" value={m.qtySqft} placeholder="Sqrft"
                          onChange={e => { const d = [...richMaterials]; d[idx].qtySqft = Math.max(0, parseFloat(e.target.value) || 0); setRichMaterials(d); }}
                          className="bg-gray-900 border border-gray-850 text-white text-[11px] p-1 rounded text-center font-mono"
                        />
                        <input
                          type="number" min="0" value={m.price} placeholder="$/pi²"
                          onChange={e => { const d = [...richMaterials]; d[idx].price = Math.max(0, parseFloat(e.target.value) || 0); setRichMaterials(d); }}
                          className="bg-gray-900 border border-gray-850 text-white text-[11px] p-1 rounded text-right font-mono col-span-1"
                        />
                        <button
                          type="button" onClick={() => setRichMaterials(richMaterials.filter((_, i) => i !== idx))}
                          className="bg-gray-800 text-red-400 p-1 rounded hover:bg-red-950 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Labor entries */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1">👷 Main-d\'œuvre spécialisée ({richLabours.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRichLabours([...richLabours, { task: 'Pose de membrane et isolation', hours: 12, rate: 45, isFlat: false }]);
                        }}
                        className="text-[10px] uppercase font-bold text-orange-500 hover:underline"
                      >
                        + Ajouter Main-d'œuvre
                      </button>
                    </div>

                    {richLabours.map((lb, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 bg-gray-900/60 p-2 rounded">
                        <input
                          type="text" value={lb.task} placeholder="Tâche"
                          onChange={e => { const d = [...richLabours]; d[idx].task = e.target.value; setRichLabours(d); }}
                          className="bg-gray-900 border border-gray-850 text-white text-[11px] p-1 rounded col-span-2"
                        />
                        <input
                          type="number" min="0" value={lb.hours} placeholder="Heures"
                          onChange={e => { const d = [...richLabours]; d[idx].hours = Math.max(0, parseFloat(e.target.value) || 0); setRichLabours(d); }}
                          className="bg-gray-900 border border-gray-850 text-white text-[11px] p-1 rounded text-center font-mono"
                        />
                        <input
                          type="number" min="0" value={lb.rate} placeholder="$/heure"
                          onChange={e => { const d = [...richLabours]; d[idx].rate = Math.max(0, parseFloat(e.target.value) || 0); setRichLabours(d); }}
                          className="bg-gray-900 border border-gray-850 text-white text-[11px] p-1 rounded text-right font-mono col-span-2 text-orange-400"
                        />
                        <button
                          type="button" onClick={() => setRichLabours(richLabours.filter((_, i) => i !== idx))}
                          className="bg-gray-800 text-red-400 p-1 rounded hover:bg-red-950 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* Extras Financial Parameters (Builders Lien holdbacks / deposits) */}
              <div className="grid grid-cols-3 gap-3 border border-gray-800 p-3 rounded-lg bg-gray-900/40">
                <div className="space-y-1">
                  <label className="text-gray-400 block">Escompte (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPct}
                    onChange={e => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="ex: 5"
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none text-right font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block">Retenue Garantie (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={holdbackPct}
                    onChange={e => setHoldbackPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder={isQuebec ? 'ex: 10 pour la CCQ' : 'ex: 10'}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none text-right font-mono text-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block">Acompte demandé ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={depositAmount}
                    onChange={e => setDepositAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="ex: 2500"
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none text-right font-mono text-green-400"
                  />
                </div>
              </div>

              {/* Warranty and legal settings if Contract selected */}
              {(newDocType === 'contract' || newDocType === 'quote') && (
                <div className="space-y-2 border border-gray-800 p-3 rounded-lg">
                  <span className="font-extrabold text-white text-[11px] uppercase tracking-wide block text-indigo-400">📜 Clauses sauvegardables de garantie (APCHQ Québécois)</span>
                  
                  {/* Select Preset to inject with zero friction */}
                  <div className="flex items-center gap-2 mb-2 bg-gray-950 p-2 rounded border border-gray-850">
                    <span className="text-[10px] text-gray-500 font-mono">Injecter modèle type :</span>
                    <button
                      type="button"
                      onClick={() => {
                        setClauseChange(clausePresets.changeOrder);
                        setClauseResil(clausePresets.resiliation);
                        setClauseWarr(clausePresets.warranty);
                        alert("Clauses juridiques APCHQ injectées dans l'entente.");
                      }}
                      className="px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-900 text-[10px] font-bold rounded hover:bg-indigo-900/50 cursor-pointer"
                    >
                      Insérer Clauses Types
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-gray-400 block">Description travaux (Chantier)</label>
                      <textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="ex: Remplacement intégrale du fibro-ciment extérieur"
                        className="w-full bg-[#161822] border border-gray-800 text-white rounded p-1.5 h-14"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-400 block">Clause Garantie Décennale</label>
                      <textarea
                        value={clauseWarr}
                        onChange={e => setClauseWarr(e.target.value)}
                        className="w-full bg-[#161822] border border-gray-805 text-white rounded p-1.5 h-14"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Signatures tactiles réelles (dessinées au doigt ou à la souris) */}
              <div className={`grid gap-4 border-t border-gray-800 pt-3 ${newDocType === 'contract' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                <div key={`owner-${signaturePadResetKey}`}>
                  <SignaturePad
                    label="Signature de l'entrepreneur"
                    value={ownerSignatureData}
                    onChange={setOwnerSignatureData}
                    required
                    accentClass="text-gray-400"
                  />
                </div>

                {newDocType === 'contract' && (
                  <div key={`client-${signaturePadResetKey}`}>
                    <SignaturePad
                      label="Signature du client"
                      value={clientSignatureData}
                      onChange={setClientSignatureData}
                      required
                      accentClass="text-orange-500"
                    />
                  </div>
                )}
              </div>
              {newDocType !== 'contract' && (
                <p className="text-[10px] text-gray-500 -mt-2">
                  Ce type de document n'est signé que par l'entrepreneur. Seule une entente/contrat requiert aussi la signature tactile du client.
                </p>
              )}

              {/* Submit trigger button */}
              <button
                onClick={handleCreateDocument}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <Check className="w-4 h-4" />
                <span>Générer et cataloguer la pièce</span>
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
