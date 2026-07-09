import React, { useState, useEffect } from 'react';
import useAppStore from '../store';
import { CANADIAN_REGIONS, US_REGIONS, TaxRegion } from '../regionsData';
import { Building2, Globe, Sparkles, ChevronRight, ChevronLeft, Check, AlertTriangle, ShieldCheck, Database, RefreshCw } from 'lucide-react';

export default function OnboardingScreen() {
  const { 
    currentLanguage, setLanguage, 
    currentTheme, setTheme, 
    companyInfo, updateCompanyInfo, 
    setIsOnboarded 
  } = useAppStore();

  const [step, setStep] = useState<number>(1);
  const [companyName, setCompanyName] = useState<string>(companyInfo.name || 'Votre Entreprise Inc.');
  const [selectedCountry, setSelectedCountry] = useState<'CA' | 'US'>('CA');
  const [selectedRegion, setSelectedRegion] = useState<TaxRegion>(CANADIAN_REGIONS[0]); // default QC
  const [taxNum1, setTaxNum1] = useState<string>('');
  const [taxNum2, setTaxNum2] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStepIndex, setSyncStepIndex] = useState<number>(0);

  // When country swaps, pre-select first region of that country
  useEffect(() => {
    if (selectedCountry === 'CA') {
      setSelectedRegion(CANADIAN_REGIONS[0]); 
    } else {
      setSelectedRegion(US_REGIONS[4]); // default California CA for US
    }
  }, [selectedCountry]);

  // Synchronisation with Supabase status updates
  const syncSteps = currentLanguage === 'FR' ? [
    'Initialisation de la connexion sécurisée...',
    'Création de la structure de base (PostgreSQL)...',
    'Application des règles de taxes régionales...',
    'Génération des schémas de factures et clients...',
    'Configuration des règles de géofencing...',
    'Chiffrement et réplication des données...',
    'Synchronisation Supabase réussie !'
  ] : [
    'Initializing secure endpoint tunnel...',
    'Provisioning database schema (PostgreSQL)...',
    'Applying regional tax policies...',
    'Bootstrapping clients and invoices structures...',
    'Configuring geofence validation matrix...',
    'Encrypting offline-first sync cache...',
    'Supabase synchronization complete!'
  ];

  useEffect(() => {
    let timer: any;
    if (isSyncing) {
      timer = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              // Finalize onboarding in store
              updateCompanyInfo({
                name: companyName,
                country: selectedCountry,
                region: selectedRegion.code,
                taxRate1: selectedRegion.taxRate1,
                taxRate2: selectedRegion.taxRate2,
                taxRate1Name: currentLanguage === 'FR' ? selectedRegion.taxRate1NameFR : selectedRegion.taxRate1NameEN,
                taxRate2Name: currentLanguage === 'FR' ? selectedRegion.taxRate2NameFR : selectedRegion.taxRate2NameEN,
                gstNumber: taxNum1,
                qstNumber: taxNum2,
                isOnboarded: true
              });
              setIsOnboarded(true);
            }, 800);
            return 100;
          }
          
          // Increment progress step index
          const nextVal = prev + 1;
          const sectionSize = 100 / syncSteps.length;
          const nextStepIdx = Math.min(Math.floor(nextVal / sectionSize), syncSteps.length - 1);
          setSyncStepIndex(nextStepIdx);
          
          return nextVal;
        });
      }, 25);
    }
    return () => clearInterval(timer);
  }, [isSyncing, companyName, selectedCountry, selectedRegion, taxNum1, taxNum2, currentLanguage]);

  // Accent styling helpers based on active theme
  const getThemeAccentClass = () => {
    switch (currentTheme) {
      case 'quantum': return 'shadow-[0_0_25px_rgba(6,182,212,0.15)] border-cyan-500/40 from-[#0c242e] via-[#051119] to-[#0A0D14]';
      case 'xp': return 'shadow-[0_0_25px_rgba(168,85,247,0.15)] border-purple-500/40 from-[#1f0f2b] via-[#0d0514] to-[#0B0D13]';
      case 'deco': return 'shadow-[0_0_25px_rgba(245,158,11,0.12)] border-amber-500/40 from-[#21170d] via-[#100b06] to-[#0D0F13]';
      case 'inferno': return 'shadow-[0_0_25px_rgba(239,68,68,0.15)] border-red-600/40 from-[#2b0c0a] via-[#140504] to-[#0A0605]';
      case 'arctic': return 'shadow-[0_0_25px_rgba(125,211,252,0.15)] border-sky-400/40 from-[#091b24] via-[#040c11] to-[#090C11]';
      case 'carbon': return 'shadow-[0_0_25px_rgba(163,163,163,0.1)] border-zinc-650 from-[#1a1a1a] via-[#0e0e0e] to-[#0F0F10]';
      default: return 'shadow-xl border-gray-800 from-[#161a23] to-[#0F1115]';
    }
  };

  const getThemeButtonClass = () => {
    switch (currentTheme) {
      case 'quantum': return 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/50';
      case 'xp': return 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50';
      case 'deco': return 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/50';
      case 'inferno': return 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50';
      case 'arctic': return 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-950/50 font-extrabold';
      case 'carbon': return 'bg-zinc-100 hover:bg-white text-black shadow-lg';
      default: return 'bg-orange-600 hover:bg-orange-500 text-white';
    }
  };

  const getThemeTextClass = () => {
    switch (currentTheme) {
      case 'quantum': return 'text-cyan-400';
      case 'xp': return 'text-purple-400';
      case 'deco': return 'text-amber-500';
      case 'inferno': return 'text-red-500';
      case 'arctic': return 'text-sky-300';
      case 'carbon': return 'text-zinc-200';
      default: return 'text-orange-500';
    }
  };

  const getThemeTextGlow = () => {
    switch (currentTheme) {
      case 'quantum': return 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]';
      case 'xp': return 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]';
      case 'deco': return 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'inferno': return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      case 'arctic': return 'text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.5)]';
      case 'carbon': return 'text-white';
      default: return 'text-orange-500';
    }
  };

  return (
    <div id="onboarding-root" className="min-h-screen bg-[#0A0C10] text-[#E0E2E6] font-sans flex flex-col justify-center items-center p-4 selection:bg-orange-600 selection:text-white transition-colors duration-500">
      
      {/* Dynamic Background Flare */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none transition-colors duration-500 bg-gradient-to-br from-orange-500 to-amber-600" style={{
        backgroundColor: currentTheme === 'quantum' ? '#06b6d4' : 
                         currentTheme === 'xp' ? '#a855f7' : 
                         currentTheme === 'deco' ? '#f59e0b' : 
                         currentTheme === 'inferno' ? '#ef4444' : 
                         currentTheme === 'arctic' ? '#38bdf8' : '#eab308'
      }}></div>

      <div 
        id="onboarding-card"
        className={`w-full max-w-2xl bg-gradient-to-b border rounded-3xl p-6 sm:p-8 relative z-10 transition-all duration-500 ${getThemeAccentClass()}`}
      >
        {/* Onboarding Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-600/10 rounded-xl border border-orange-500/30">
              <Building2 className={`w-6 h-6 ${getThemeTextClass()}`} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-widest text-neutral-400 font-mono uppercase">
                {currentLanguage === 'FR' ? 'MISE EN SERVICE' : 'SYSTEM PROVISIONING'}
              </h2>
              <h1 className="text-lg font-bold text-white leading-none">
                {companyName || 'Gestion Chantier Pro'}
              </h1>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold border transition-all duration-350 ${
                  step === s 
                    ? 'bg-orange-600 text-white border-orange-500 scale-110 shadow-lg shadow-orange-950/30' 
                    : step > s 
                    ? 'bg-green-950/40 text-green-400 border-green-800' 
                    : 'bg-gray-900 text-gray-500 border-gray-800'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* -------------------- STEP 1: GENERAL CONFIG & THEME -------------------- */}
        {step === 1 && (
          <div id="ob-step-1" className="space-y-6">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-xl font-bold text-white">
                {currentLanguage === 'FR' ? '1. Langue, Compagnie et Thème' : '1. Language, Company & Theme'}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {currentLanguage === 'FR' 
                  ? 'Personnalisez votre plateforme. Sélectionnez la langue légale, saisissez le nom de votre compagnie et associez un thème visuel.'
                  : 'Customize your platform setup. Choose the primary language, type your legal firm name and select an active theme.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">
                  {currentLanguage === 'FR' ? 'Langue de l\'App' : 'App Language'}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setLanguage('FR')}
                    className={`flex-1 py-3 text-center rounded-xl border font-bold cursor-pointer transition flex items-center justify-center gap-2 ${
                      currentLanguage === 'FR' 
                        ? 'bg-orange-600 border-orange-500 text-white font-black' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🇨🇦</span>
                    <span>Français (CA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('EN')}
                    className={`flex-1 py-3 text-center rounded-xl border font-bold cursor-pointer transition flex items-center justify-center gap-2 ${
                      currentLanguage === 'EN' 
                        ? 'bg-orange-600 border-orange-500 text-white font-black' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>English (US)</span>
                  </button>
                </div>
              </div>

              {/* Company Legal Name Input */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">
                  {currentLanguage === 'FR' ? 'Nom légal de la compagnie' : 'Company Legal Name'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={currentLanguage === 'FR' ? 'ex: Toiture Elite Inc.' : 'ex: Summit Roofs Ltd.'}
                    className="w-full p-2.5 bg-gray-900 border border-gray-850 rounded-xl text-white text-xs text-left focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <span className="absolute right-3 top-3 text-[10px] text-orange-500 font-mono font-bold uppercase tracking-wider">
                    {currentLanguage === 'FR' ? 'Requis' : 'Required'}
                  </span>
                </div>
              </div>

            </div>

            {/* Visual Theme Selection Grid */}
            <div className="space-y-3">
              <label className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">
                {currentLanguage === 'FR' ? 'Sélectionner un Thème Visuel Pro' : 'Select a Professional Theme Preset'}
              </label>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'quantum', nameFR: 'Quantum Blue', nameEN: 'Quantum Blue', descFR: 'Bleu cyan électrique', descEN: 'Electric cyan glow' },
                  { id: 'xp', nameFR: 'Grand XP', nameEN: 'Grand XP', descFR: 'Violet et orange vibrant', descEN: 'Vibrant purple & orange' },
                  { id: 'deco', nameFR: 'Art Deco', nameEN: 'Art Deco', descFR: 'Détails dorés & ambre luxe', descEN: 'Gold details & amber luxury' },
                  { id: 'inferno', nameFR: 'Inferno Braise', nameEN: 'Inferno Ember', descFR: 'Fini braise écarlate et rouge', descEN: 'Crimson aura and fire red' },
                  { id: 'arctic', nameFR: 'Arctic Boréal', nameEN: 'Arctic Glacial', descFR: 'Effet de givre bleu glacé', descEN: 'Icy frost and glacial highlights' },
                  { id: 'carbon', nameFR: 'Carbon Métal', nameEN: 'Sleek Carbon', descFR: 'Brossé industriel gris foncé', descEN: 'Dark industrial carbon' }
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id as any)}
                    className={`p-3 rounded-xl text-left border cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      currentTheme === th.id 
                        ? 'bg-gray-800/80 border-orange-500 scale-[1.02] shadow-md ring-1 ring-orange-500/20' 
                        : 'bg-gray-900/50 border-gray-800 hover:bg-gray-850 text-gray-300'
                    }`}
                  >
                    {/* Tiny visual badge indicator */}
                    {currentTheme === th.id && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🎨</span>
                      <p className="text-xs font-bold font-sans text-white">
                        {currentLanguage === 'FR' ? th.nameFR : th.nameEN}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      {currentLanguage === 'FR' ? th.descFR : th.descEN}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- STEP 2: COUNTRY SELECTION -------------------- */}
        {step === 2 && (
          <div id="ob-step-2" className="space-y-6">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-xl font-bold text-white">
                {currentLanguage === 'FR' ? '2. Pays d\'Opération de l\'Entreprise' : '2. Company Operating Country'}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {currentLanguage === 'FR'
                  ? 'Définissez le cadre réglementaire et fiscal. Les barèmes fiscaux seront automatiquement structurés selon le pays choisi.'
                  : 'Define the tax framework and accounting bounds. Tax parameters will auto-tune to your country structure.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Canada */}
              <button
                type="button"
                onClick={() => setSelectedCountry('CA')}
                className={`p-6 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                  selectedCountry === 'CA'
                    ? 'bg-orange-600/10 border-orange-500 text-white scale-[1.02] shadow-xl'
                    : 'bg-gray-900 border-gray-800 hover:bg-gray-850 text-gray-400'
                }`}
              >
                <span className="text-5xl">🇨🇦</span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {currentLanguage === 'FR' ? 'Canada' : 'Canada'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal max-w-[200px]">
                    {currentLanguage === 'FR' 
                      ? 'Taxes de vente TPS, TVQ, TVH ou TVP d\'application nationale.'
                      : 'GST, QST, HST, and provincial tax matrices computed instantly.'}
                  </p>
                </div>
              </button>

              {/* USA */}
              <button
                type="button"
                onClick={() => setSelectedCountry('US')}
                className={`p-6 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                  selectedCountry === 'US'
                    ? 'bg-orange-600/10 border-orange-500 text-white scale-[1.02] shadow-xl'
                    : 'bg-gray-900 border-gray-800 hover:bg-gray-850 text-gray-400'
                }`}
              >
                <span className="text-5xl">🇺🇸</span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {currentLanguage === 'FR' ? 'États-Unis' : 'United States'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal max-w-[200px]">
                    {currentLanguage === 'FR' 
                      ? 'Calculs de taxes de vente étatiques (State Tax) de 50 états + DC.'
                      : 'Dynamic state sales tax logic mapping 50 states plus DC.'}
                  </p>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* -------------------- STEP 3: REGIONS & OPTIONAL TAXES -------------------- */}
        {step === 3 && (
          <div id="ob-step-3" className="space-y-6">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-xl font-bold text-white">
                {currentLanguage === 'FR' ? '3. Sélection de la Région et Numéros de Taxes' : '3. Regional Sales Rates & Tax Numbers'}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {currentLanguage === 'FR'
                  ? 'Sélectionnez une province ou un état pour charger les vrais taux de taxes applicables par défaut. Vos numéros de taxes sont optionnels.'
                  : 'Select your local province or state to load statutory rates by default. Tax IDs are fully optional.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Region Selector dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">
                  {selectedCountry === 'CA' 
                    ? (currentLanguage === 'FR' ? 'Province / Territoire' : 'Province / Territory')
                    : (currentLanguage === 'FR' ? 'État Américain' : 'US State')}
                </label>
                
                <select
                  value={selectedRegion.code}
                  onChange={(e) => {
                    const list = selectedCountry === 'CA' ? CANADIAN_REGIONS : US_REGIONS;
                    const r = list.find(reg => reg.code === e.target.value);
                    if (r) setSelectedRegion(r);
                  }}
                  className="w-full p-2.5 bg-gray-900 border border-gray-850 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {(selectedCountry === 'CA' ? CANADIAN_REGIONS : US_REGIONS).map((reg) => (
                    <option key={reg.code} value={reg.code} className="bg-slate-950">
                      {reg.code} - {currentLanguage === 'FR' ? reg.nameFR : reg.nameEN}
                    </option>
                  ))}
                </select>

                {/* Live Tax Rates Preview */}
                <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-850 text-xs space-y-1.5 mt-2">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wide">
                    {currentLanguage === 'FR' ? 'Taux de taxe détectés :' : 'Estimated Statutory Taxes :'}
                  </span>
                  
                  {selectedRegion.taxRate1 > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{currentLanguage === 'FR' ? selectedRegion.taxRate1NameFR : selectedRegion.taxRate1NameEN}</span>
                      <span className="font-bold text-white">{(selectedRegion.taxRate1 * 100).toFixed(2)} %</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{currentLanguage === 'FR' ? selectedRegion.taxRate2NameFR : selectedRegion.taxRate2NameEN}</span>
                    <span className="font-bold text-white">{(selectedRegion.taxRate2 * 100).toFixed(2)} %</span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-850 text-xs">
                    <span className={`font-semibold ${getThemeTextClass()}`}>{currentLanguage === 'FR' ? 'Taxe combinée :' : 'Combined rate :'}</span>
                    <span className="font-mono font-black text-white">
                      {((selectedRegion.taxRate1 + selectedRegion.taxRate2) * 100).toFixed(3)} %
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Registration Numbers */}
              <div className="space-y-3">
                
                {/* Tax ID 1 Input - optional */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-400 uppercase font-mono tracking-widest leading-none">
                      {selectedCountry === 'CA' 
                        ? (currentLanguage === 'FR' ? 'Numéro de TPS / GST' : 'GST / HST Registration N°')
                        : (currentLanguage === 'FR' ? 'Numéro Fiscal de l\'État' : 'State Tax ID')}
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-850 text-gray-400 border border-gray-800 font-mono tracking-tight uppercase">
                      {currentLanguage === 'FR' ? 'Optionnel' : 'Optional'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={taxNum1}
                    onChange={(e) => setTaxNum1(e.target.value)}
                    placeholder={selectedCountry === 'CA' ? 'TPS 102938475-RT0001' : 'State-ID 1234-567'}
                    className="w-full p-2 bg-gray-900 border border-gray-850 rounded-xl text-white text-xs font-mono text-left focus:outline-none"
                  />
                </div>

                {/* Tax ID 2 Input - optional */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-400 uppercase font-mono tracking-widest leading-none">
                      {selectedCountry === 'CA' 
                        ? (currentLanguage === 'FR' ? 'Numéro de TVQ / QST' : 'QST / PST Registration N°')
                        : (currentLanguage === 'FR' ? 'Numéro d\'Enregistrement Fédéral US (EIN)' : 'Employer ID Number (EIN)')}
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-850 text-gray-400 border border-gray-800 font-mono tracking-tight uppercase">
                      {currentLanguage === 'FR' ? 'Optionnel' : 'Optional'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={taxNum2}
                    onChange={(e) => setTaxNum2(e.target.value)}
                    placeholder={selectedCountry === 'CA' ? 'TVQ 1002938475-TQ0001' : 'EIN-87-6543210'}
                    className="w-full p-2 bg-gray-900 border border-gray-850 rounded-xl text-white text-xs font-mono text-left focus:outline-none"
                  />
                </div>

              </div>

            </div>
          </div>
        )}

        {/* -------------------- STEP 4: RECAP & SIMULATED SYNC -------------------- */}
        {step === 4 && (
          <div id="ob-step-4" className="space-y-6">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-xl font-bold text-white">
                {currentLanguage === 'FR' ? '4. Résumé et Synchronisation Supabase' : '4. Summary & Supabase Direct Sync'}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {currentLanguage === 'FR'
                  ? 'Vérifiez la configuration de base de votre cabinet. Le système effectuera un appairage en direct avec l\'API de Supabase.'
                  : 'Verify your company profile parameters. The system will now bind and replicate details directly on Supabase server.'}
              </p>
            </div>

            {/* Sync Progress Layer */}
            {isSyncing ? (
              <div className="p-6 bg-gray-950/80 rounded-2xl border border-gray-850 flex flex-col justify-center items-center text-center space-y-6 shadow-inner animate-fade-in">
                
                {/* Active Rotating Database Icon */}
                <div className="relative flex justify-center items-center w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-full">
                  <Database className="w-8 h-8 text-neutral-150 animate-bounce" />
                  <RefreshCw className="absolute inset-0 w-16 h-16 text-cyan-400 animate-spin opacity-40" style={{ animationDuration: '3s' }} />
                </div>

                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
                    <span className="font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      {currentLanguage === 'FR' ? 'APPAIRAGE SUPABASE' : 'SUPABASE PAIRING'}
                    </span>
                    <span className="font-black text-white">{syncProgress} %</span>
                  </div>

                  {/* Progress bar container */}
                  <div className="h-2.5 bg-gray-900 rounded-full overflow-hidden border border-gray-850">
                    <div 
                      className={`h-full transition-all duration-300 bg-gradient-to-r ${
                        currentTheme === 'quantum' ? 'from-cyan-600 to-cyan-400' :
                        currentTheme === 'xp' ? 'from-purple-600 to-pink-500' :
                        currentTheme === 'deco' ? 'from-amber-600 to-yellow-400' :
                        currentTheme === 'inferno' ? 'from-red-600 to-orange-500' :
                        currentTheme === 'arctic' ? 'from-sky-600 to-teal-400' :
                        'from-orange-600 to-orange-400'
                      }`}
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    {syncSteps[syncStepIndex]}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                    Supabase PostgreSQL • ssl_mode=require
                  </p>
                </div>

              </div>
            ) : (
              /* Config Summary Dashboard cards */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Company and Lang card */}
                  <div className="p-4 bg-gray-900 rounded-xl space-y-1 border border-gray-850">
                    <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider block">
                      {currentLanguage === 'FR' ? 'IDENTITÉ COMPAGNIE' : 'COMPANY IDENTITY'}
                    </span>
                    <h5 className="text-xs font-bold text-white font-sans max-w-[200px] truncate">
                      {companyName}
                    </h5>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 pt-1 border-t border-gray-805 mt-1">
                      <span>🌐</span>
                      <span>
                        {currentLanguage === 'FR' ? 'Langue de l\'appli :' : 'System language :'} <strong>{currentLanguage}</strong>
                      </span>
                    </span>
                  </div>

                  {/* Regions taxes card */}
                  <div className="p-4 bg-gray-900 rounded-xl space-y-1 border border-gray-850">
                    <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider block">
                      {currentLanguage === 'FR' ? 'CADRE FISCAL ACTIF' : 'FISCAL SETTINGS'}
                    </span>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{selectedCountry === 'CA' ? '🇨🇦' : '🇺🇸'}</span>
                      <span>{selectedRegion.code} • {currentLanguage === 'FR' ? selectedRegion.nameFR : selectedRegion.nameEN}</span>
                    </h5>
                    
                    <span className="text-[10px] text-gray-400 block pt-1 border-t border-gray-805 mt-1 font-mono">
                      {currentLanguage === 'FR' ? 'Calcul Taxes combinées :' : 'Combined Statutory Rate :'} <strong>{((selectedRegion.taxRate1 + selectedRegion.taxRate2)*100).toFixed(3)} %</strong>
                    </span>
                  </div>

                  {/* Tax numbers if configured */}
                  <div className="p-4 bg-gray-900 rounded-xl space-y-1 border border-gray-850 col-span-2">
                    <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wider block">
                      {currentLanguage === 'FR' ? 'NUMÉROS DE TAXE COMPAGNIE' : 'TAX REGISTRATION NUMERALS'}
                    </span>
                    
                    <div className="grid grid-cols-2 gap-4 pt-1.5">
                      <div>
                        <span className="text-[10px] text-gray-400 block leading-none">
                          {selectedCountry === 'CA' ? 'TPS / GST' : (currentLanguage === 'FR' ? 'Fiscalité d\'État' : 'State Tax ID')}
                        </span>
                        <span className="text-xs font-mono text-white inline-block mt-1 font-bold">
                          {taxNum1 || (currentLanguage === 'FR' ? 'Non configuré (Optionnel)' : 'Not entered (Optional)')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block leading-none">
                          {selectedCountry === 'CA' ? 'TVQ / QST' : (currentLanguage === 'FR' ? 'EIN Fédéral' : 'EIN Number')}
                        </span>
                        <span className="text-xs font-mono text-white inline-block mt-1 font-bold">
                          {taxNum2 || (currentLanguage === 'FR' ? 'Non configuré (Optionnel)' : 'Not entered (Optional)')}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Info Disclaimer */}
                <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl text-xs flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    {currentLanguage === 'FR' 
                      ? 'Sécurité renforcée : la base locale indexDB synchronisera continuellement vos données d\'intervention même hors-ligne.'
                      : 'End-to-end security: your local indexDB store will cache and replicate sessions securely during field assignments.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- DYNAMIC NEXT / BACK CONTROL ACTIONS -------------------- */}
        {!isSyncing && (
          <div className="flex justify-between items-center mt-8 pt-5 border-t border-gray-805">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((p) => p - 1)}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-850 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{currentLanguage === 'FR' ? 'Reculer' : 'Previous'}</span>
              </button>
            ) : (
              <div></div> // Empty div for flex justification
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !companyName.trim()) {
                    alert(currentLanguage === 'FR' ? 'Veuillez renseigner le nom de votre compagnie pour poursuivre.' : 'Please enter your legal company name to proceed.');
                    return;
                  }
                  setStep((p) => p + 1);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${getThemeButtonClass()}`}
              >
                <span>{currentLanguage === 'FR' ? 'Continuer' : 'Continue'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSyncing(true)}
                className={`px-6 py-3 font-extrabold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer flex items-center gap-2 ${getThemeButtonClass()}`}
              >
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{currentLanguage === 'FR' ? 'Synchroniser Supabase & Lancer' : 'Sync Supabase & Launch'}</span>
              </button>
            )}
          </div>
        )}

      </div>

      <p className="text-[10px] text-gray-600 font-mono mt-6 text-center select-none uppercase tracking-widest">
        {currentLanguage === 'FR' ? 'Gestion Chantier Pro • Version 4.8 Cloud Suite' : 'Gestion Chantier Pro • Cloud Suite v4.8'}
      </p>

    </div>
  );
}
