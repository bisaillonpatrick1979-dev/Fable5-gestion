import React, { useRef, useState } from 'react';
import useAppStore from '../store';
import { CatalogueMaterial, CatalogueUnit } from '../types';
import { Trash, Edit, Check, X, Camera } from 'lucide-react';

const IMAGE_KEYWORDS: { keywords: string[]; url: string; alt: string }[] = [
  // Toiture
  { keywords: ['bardeau','shingle','asphalte','architectural'],
    url: 'https://images.unsplash.com/photo-1625756975-c71c4ff88df1?w=400&q=80',
    alt: 'Bardeaux d\'asphalte sur toiture' },
  { keywords: ['sous-couche','feltex','synthétique'],
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
    alt: 'Rouleau de sous-couche pour toiture' },
  { keywords: ['ice','water','shield','membrane'],
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80',
    alt: 'Membrane ice and water shield' },
  { keywords: ['ventilation','faîte','ridge'],
    url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80',
    alt: 'Ventilation de faîte de toiture' },
  // Siding
  { keywords: ['hardie','fibrociment','fibre de ciment','cement'],
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    alt: 'Revêtement en fibre de ciment' },
  { keywords: ['vinyle','vinyl','clapboard','siding'],
    url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
    alt: 'Siding en vinyle blanc' },
  { keywords: ['lp','smartside','bois composite'],
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
    alt: 'LP SmartSide revêtement composite' },
  { keywords: ['tyvek','pare-air','housewrap'],
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=80',
    alt: 'Membrane pare-air Tyvek' },
  { keywords: ['osb','panneau','contreplaqué','plywood'],
    url: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400&q=80',
    alt: 'Panneaux OSB empilés' },
  // Soffit / Fascia
  { keywords: ['soffite','soffit'],
    url: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400&q=80',
    alt: 'Soffite en vinyle ventilé' },
  { keywords: ['fascia'],
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
    alt: 'Fascia aluminium blanc' },
  // Fixations
  { keywords: ['clou','nail'],
    url: 'https://images.unsplash.com/photo-1590598016683-c8e8b8e6c99a?w=400&q=80',
    alt: 'Clous galvanisés pour construction' },
  { keywords: ['vis','screw','inox'],
    url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&q=80',
    alt: 'Vis en acier inoxydable' },
  { keywords: ['agrafe','staple'],
    url: 'https://images.unsplash.com/photo-1590041794748-2d8eb73a571c?w=400&q=80',
    alt: 'Agrafes métalliques' },
  // Étanchéité
  { keywords: ['calfeutrant','caulk','silicone'],
    url: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400&q=80',
    alt: 'Tube de calfeutrant extérieur' },
  { keywords: ['mousse','foam'],
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    alt: 'Mousse polyuréthane expansive' },
  { keywords: ['ruban','tape'],
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&q=80',
    alt: 'Ruban adhésif pour membrane' },
  // Structure
  { keywords: ['planche','board','2x4','2x6','2x8','bois'],
    url: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=400&q=80',
    alt: 'Planches de bois SPF empilées' },
  // Main-d'oeuvre
  { keywords: ['installation','pose','install'],
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
    alt: 'Ouvrier installant du revêtement' },
  { keywords: ['dépose','removal','enlèvement'],
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&q=80',
    alt: 'Dépose de l\'ancien revêtement' },
  { keywords: ['toiture','roofing','couvreur'],
    url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80',
    alt: 'Couvreur posant des bardeaux' },
];

function suggestImageUrl(name: string): { url: string; alt: string } | null {
  const n = name.toLowerCase();
  const match = IMAGE_KEYWORDS.find(entry =>
    entry.keywords.some(k => n.includes(k))
  );
  return match ? { url: match.url, alt: match.alt } : null;
}

function suggestEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('bardeau') || n.includes('shingle') || n.includes('asphalte') || n.includes('toiture')) return '🏠';
  if (n.includes('siding') || n.includes('vinyle') || n.includes('revêtement')) return '🧱';
  if (n.includes('clou') || n.includes('vis') || n.includes('screw') || n.includes('nail')) return '🔩';
  if (n.includes('membrane') || n.includes('tyvek') || n.includes('pare-air')) return '💨';
  if (n.includes('soffite') || n.includes('fascia')) return '🧇';
  if (n.includes('planche') || n.includes('bois') || n.includes('osb')) return '🪵';
  if (n.includes('installation') || n.includes('pose') || n.includes('poseur') || n.includes('couvreur') || n.includes('travail')) return '👷';
  return '📦';
}

const UNIT_META: Record<CatalogueUnit, { short: string; full: string }> = {
  pi2: { short: 'pi²', full: 'Pied carré (pi²)' },
  pi_lin: { short: 'pi lin.', full: 'Pied linéaire (pi lin.)' },
  boite: { short: 'boîte', full: 'Boîte' },
  rouleau: { short: 'rouleau', full: 'Rouleau' },
  unite: { short: 'unité', full: 'Unité' },
  lot: { short: 'lot', full: 'Lot' },
};

const UNIT_OPTIONS: CatalogueUnit[] = ['pi2', 'pi_lin', 'boite', 'rouleau', 'unite', 'lot'];

// Suggère une unité de vente courante à partir du nom (boîte, rouleau, pied linéaire...),
// avec une note de contenu quand la quantité par boîte est connue d'usage.
function suggestUnit(name: string): { unit: CatalogueUnit; unitNote: string } | null {
  const n = name.toLowerCase();
  if (n.includes('flashing') || n.includes('solin') || n.includes('tôle de rive') || n.includes('fascia')) {
    return { unit: 'pi_lin', unitNote: '' };
  }
  if (n.includes('clou') || n.includes('vis') || n.includes('agrafe') || n.includes('attache')) {
    return { unit: 'boite', unitNote: '' };
  }
  if (n.includes('siding') || n.includes('revêtement') || n.includes('parement')) {
    return n.includes('premium')
      ? { unit: 'boite', unitNote: '≈340 pièces/boîte' }
      : { unit: 'boite', unitNote: '≈240 pièces/boîte' };
  }
  if (n.includes('bardeau') || n.includes('shingle')) {
    return { unit: 'boite', unitNote: '' };
  }
  if (n.includes('membrane') || n.includes('sous-couche') || n.includes('pare-air') || n.includes('housewrap') || n.includes('tyvek')) {
    return { unit: 'rouleau', unitNote: '' };
  }
  return null;
}

function MaterialImage({ mat, className }: { mat: { name: string; emoji?: string; imageUrl?: string; imageAlt?: string }; className?: string }) {
  const [error, setError] = useState(false);
  const box = className || 'w-full h-[90px] mb-2';

  if (mat.imageUrl && !error) {
    return (
      <img
        src={mat.imageUrl}
        alt={mat.imageAlt || mat.name}
        onError={() => setError(true)}
        className={`${box} object-cover rounded-lg block border border-gray-800`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${box} flex items-center justify-center text-4xl rounded-lg bg-gray-950 border border-gray-850`}>
      {mat.emoji || '📦'}
    </div>
  );
}

type CatalogueFormState = {
  name: string;
  emoji: string;
  pricePerSqFt: number;
  supplierPrice: number;
  clientPrice: number;
  supplierId: string;
  unit: CatalogueUnit;
  unitNote: string;
  imageUrl: string;
  imageAlt: string;
};

const EMPTY_FORM: CatalogueFormState = { name: '', emoji: '🪵', pricePerSqFt: 5.0, supplierPrice: 0, clientPrice: 0, supplierId: '', unit: 'pi2', unitNote: '', imageUrl: '', imageAlt: '' };

function PhotoCaptureField({ imageUrl, onChange }: { imageUrl: string; onChange: (url: string, alt: string) => void }) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result, 'Photo du matériau');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-gray-400 font-bold uppercase block font-mono">📷 Photo du matériau (couleur, texture)</label>
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden border border-gray-800">
          <img src={imageUrl} alt="Aperçu" className="w-full h-24 object-cover" referrerPolicy="no-referrer" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[11px] font-black uppercase rounded-lg transition cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          Prendre une photo
        </button>
        <input
          type="text"
          placeholder="...ou coller une URL d'image"
          className="flex-1 min-w-[160px] p-1.5 bg-gray-950 font-mono text-white text-[11px] rounded border border-gray-850"
          value={imageUrl.startsWith('data:image/') ? '' : imageUrl}
          onChange={(e) => onChange(e.target.value, 'Aperçu')}
        />
      </div>
    </div>
  );
}

export default function CatalogueManager() {
  const {
    catalogue, suppliers, activeEmployee,
    addCatalogueMaterial, updateCatalogueMaterial, deleteCatalogueMaterial,
    addSupplier, deleteSupplier
  } = useAppStore();

  const canManage = activeEmployee?.role === 'admin' || activeEmployee?.role === 'secretary';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState<CatalogueFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CatalogueFormState>(EMPTY_FORM);
  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  const handleNameChange = (name: string, form: CatalogueFormState, setForm: (f: CatalogueFormState) => void) => {
    let updated = { ...form, name };
    if (!updated.imageUrl) {
      const suggestion = suggestImageUrl(name);
      if (suggestion) {
        updated.imageUrl = suggestion.url;
        updated.imageAlt = suggestion.alt;
      }
    }
    if (updated.emoji === '🪵' || !updated.emoji) {
      updated.emoji = suggestEmoji(name);
    }
    if (updated.unit === 'pi2' && !updated.unitNote) {
      const unitSuggestion = suggestUnit(name);
      if (unitSuggestion) {
        updated.unit = unitSuggestion.unit;
        updated.unitNote = unitSuggestion.unitNote;
      }
    }
    setForm(updated);
  };

  const startEdit = (mat: CatalogueMaterial) => {
    setEditingId(mat.id);
    setEditForm({
      name: mat.name,
      emoji: mat.emoji,
      pricePerSqFt: mat.pricePerSqFt,
      supplierPrice: mat.supplierPrice || 0,
      clientPrice: mat.clientPrice || 0,
      supplierId: mat.supplierId || '',
      unit: mat.unit || 'pi2',
      unitNote: mat.unitNote || '',
      imageUrl: mat.imageUrl || '',
      imageAlt: mat.imageAlt || ''
    });
  };

  const saveEdit = (id: string) => {
    updateCatalogueMaterial({
      id,
      name: editForm.name,
      emoji: editForm.emoji || '🪵',
      pricePerSqFt: Number(editForm.pricePerSqFt),
      supplierPrice: Number(editForm.supplierPrice),
      clientPrice: Number(editForm.clientPrice),
      supplierId: editForm.supplierId || undefined,
      unit: editForm.unit,
      unitNote: editForm.unitNote || undefined,
      imageUrl: editForm.imageUrl || undefined,
      imageAlt: editForm.imageAlt || editForm.name || undefined
    });
    setEditingId(null);
  };

  const marginFor = (mat: CatalogueMaterial) => {
    const client = mat.clientPrice || 0;
    const supplier = mat.supplierPrice || 0;
    const sub = mat.pricePerSqFt || 0;
    return client - supplier - sub;
  };

  const supplierName = (id?: string) => suppliers.find(s => s.id === id)?.name;
  const unitShort = (unit?: CatalogueUnit) => UNIT_META[unit || 'pi2'].short;

  const renderUnitField = (form: CatalogueFormState, setForm: (f: CatalogueFormState) => void) => (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label className="text-[9px] text-gray-500 font-bold uppercase block font-mono">Unité de vente</label>
        <select
          className="w-full p-1.5 bg-gray-950 text-white text-xs rounded border border-gray-850"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value as CatalogueUnit })}
        >
          {UNIT_OPTIONS.map(u => (
            <option key={u} value={u}>{UNIT_META[u].full}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[9px] text-gray-500 font-bold uppercase block font-mono">Précision (optionnel)</label>
        <input
          type="text"
          placeholder="Ex: ≈340 pièces/boîte"
          className="w-full p-1.5 bg-gray-950 font-mono text-white text-xs rounded border border-gray-850"
          value={form.unitNote}
          onChange={(e) => setForm({ ...form, unitNote: e.target.value })}
        />
      </div>
    </div>
  );

  const renderPriceFields = (form: CatalogueFormState, setForm: (f: CatalogueFormState) => void) => {
    const u = UNIT_META[form.unit].short;
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[9px] text-gray-500 font-bold uppercase block font-mono">Prix Fournisseur ({`$${u}`})</label>
          <input
            type="number" step="0.05" min="0"
            className="w-full p-1.5 bg-gray-950 font-mono text-white text-xs rounded border border-gray-850"
            value={form.supplierPrice}
            onChange={(e) => setForm({ ...form, supplierPrice: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] text-gray-500 font-bold uppercase block font-mono">Prix Sous-traitant ({`$${u}`})</label>
          <input
            type="number" step="0.05" min="0"
            className="w-full p-1.5 bg-gray-950 font-mono text-white text-xs rounded border border-gray-850"
            value={form.pricePerSqFt}
            onChange={(e) => setForm({ ...form, pricePerSqFt: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] text-gray-500 font-bold uppercase block font-mono">Prix Client ({`$${u}`})</label>
          <input
            type="number" step="0.05" min="0"
            className="w-full p-1.5 bg-gray-950 font-mono text-white text-xs rounded border border-gray-850"
            value={form.clientPrice}
            onChange={(e) => setForm({ ...form, clientPrice: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      </div>
    );
  };

  const renderSupplierSelect = (form: CatalogueFormState, setForm: (f: CatalogueFormState) => void) => (
    <div className="space-y-1">
      <label className="text-[9px] text-gray-500 font-bold uppercase block font-mono">Fournisseur</label>
      <select
        className="w-full p-1.5 bg-gray-950 text-white text-xs rounded border border-gray-850"
        value={form.supplierId}
        onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
      >
        <option value="">— Aucun —</option>
        {suppliers.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h3 className="text-xl font-black text-white">Catalogue Unitaire pour Devis & Soumissions</h3>
          <p className="text-xs text-gray-400 mt-1">
            Prix Fournisseur (coût), Prix Sous-traitant (payé pour l'installation) et Prix Client (chargé) — pour connaître votre marge de profit.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSupplierManager(!showSupplierManager)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white text-xs font-black rounded-xl transition cursor-pointer"
            >
              🚚 Fournisseurs ({suppliers.length})
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setNewForm(EMPTY_FORM);
              }}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-black rounded-xl transition shadow-lg cursor-pointer"
            >
              {showAddForm ? 'Fermer le formulaire' : '+ Nouveau Matériau Catalogue'}
            </button>
          </div>
        )}
      </div>

      {/* Supplier Manager */}
      {showSupplierManager && canManage && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl text-left space-y-3 max-w-2xl">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider text-orange-400">🚚 Liste de fournisseurs</h4>
          <div className="space-y-1.5">
            {suppliers.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-2 bg-gray-950 rounded-lg border border-gray-850">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{s.name}</p>
                  {(s.contactName || s.phone) && (
                    <p className="text-[10px] text-gray-500 font-mono">{[s.contactName, s.phone].filter(Boolean).join(' — ')}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer le fournisseur "${s.name}" ?`)) deleteSupplier(s.id);
                  }}
                  className="p-1 px-2 bg-red-950/45 hover:bg-red-900 text-red-300 rounded font-bold text-[10px] cursor-pointer transition"
                >
                  <Trash className="w-3 h-3" />
                </button>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="text-xs text-gray-500 italic">Aucun fournisseur enregistré.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-850">
            <input
              type="text"
              placeholder="Nom du fournisseur"
              className="flex-1 min-w-[160px] p-2 bg-gray-950 text-white text-xs rounded-lg border border-gray-850"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Téléphone (optionnel)"
              className="w-40 p-2 bg-gray-950 text-white text-xs rounded-lg border border-gray-850"
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
            />
            <button
              disabled={!newSupplierName.trim()}
              onClick={() => {
                addSupplier({ name: newSupplierName.trim(), phone: newSupplierPhone.trim() || undefined });
                setNewSupplierName('');
                setNewSupplierPhone('');
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs rounded-xl transition disabled:opacity-40 cursor-pointer"
            >
              + Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Add Material Form */}
      {showAddForm && canManage && (
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-2xl text-left space-y-4 max-w-2xl animate-fade-in">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
            <span>📦</span> Créer un modèle de produit standard de catalogue
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase block font-mono">Émoji</label>
              <input
                type="text"
                className="w-full p-2 bg-gray-950 text-white text-xs rounded-lg border border-gray-850 text-center"
                value={newForm.emoji}
                onChange={(e) => setNewForm({ ...newForm, emoji: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase block font-mono">Nom de l'élément standard / Brevet</label>
              <input
                type="text"
                className="w-full p-2 bg-gray-950 text-white text-xs rounded-lg border border-gray-850 text-left"
                placeholder="Ex: Bardeau architectural premium"
                value={newForm.name}
                onChange={(e) => handleNameChange(e.target.value, newForm, setNewForm)}
              />
            </div>

            <div className="col-span-3">
              <PhotoCaptureField imageUrl={newForm.imageUrl} onChange={(url, alt) => setNewForm({ ...newForm, imageUrl: url, imageAlt: alt })} />
            </div>

            <div className="col-span-3">
              {renderSupplierSelect(newForm, setNewForm)}
            </div>

            <div className="col-span-3">
              {renderUnitField(newForm, setNewForm)}
            </div>

            <div className="col-span-3">
              {renderPriceFields(newForm, setNewForm)}
            </div>

            <div className="col-span-3 flex justify-end gap-2 pt-2">
              <button
                disabled={!newForm.name}
                onClick={() => {
                  addCatalogueMaterial({
                    name: newForm.name,
                    emoji: newForm.emoji || '🪵',
                    pricePerSqFt: Number(newForm.pricePerSqFt),
                    supplierPrice: Number(newForm.supplierPrice),
                    clientPrice: Number(newForm.clientPrice),
                    supplierId: newForm.supplierId || undefined,
                    imageUrl: newForm.imageUrl || undefined,
                    imageAlt: newForm.imageAlt || newForm.name || undefined
                  });
                  setShowAddForm(false);
                }}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                Ajouter au Catalogue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalogue Items List (une ligne par matériau pour rester lisible sur mobile) */}
      <div className="flex flex-col gap-3">
        {catalogue.map(cat => {
          const isEditing = editingId === cat.id;
          const margin = marginFor(cat);

          if (isEditing) {
            return (
              <div key={cat.id} className="p-4 bg-gray-900 border border-orange-500/40 rounded-2xl text-xs space-y-3 text-left">
                <input
                  type="text"
                  className="w-full p-1.5 bg-gray-950 text-white text-xs rounded border border-gray-850"
                  value={editForm.name}
                  onChange={(e) => handleNameChange(e.target.value, editForm, setEditForm)}
                />
                <PhotoCaptureField imageUrl={editForm.imageUrl} onChange={(url, alt) => setEditForm({ ...editForm, imageUrl: url, imageAlt: alt })} />
                {renderSupplierSelect(editForm, setEditForm)}
                {renderUnitField(editForm, setEditForm)}
                {renderPriceFields(editForm, setEditForm)}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-850">
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 px-3 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-lg font-bold cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                  <button
                    onClick={() => saveEdit(cat.id)}
                    className="p-1.5 px-3 bg-green-700 hover:bg-green-600 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Sauvegarder
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={cat.id} className="p-3 bg-gray-900 border border-gray-850 hover:border-gray-800 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 text-xs transition duration-200">
              <MaterialImage mat={cat} className="w-full h-24 sm:w-20 sm:h-20 flex-shrink-0" />

              <div className="flex-1 min-w-0 text-left">
                <h5 className="font-extrabold text-white text-base flex items-center gap-1.5">
                  <span>{cat.emoji}</span>
                  <span className="truncate">{cat.name}</span>
                </h5>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {supplierName(cat.supplierId) && <span>🚚 {supplierName(cat.supplierId)} • </span>}
                  <span className="uppercase">/{unitShort(cat.unit)}</span>
                  {cat.unitNote && <span> • {cat.unitNote}</span>}
                </p>
              </div>

              <div className="grid grid-cols-3 sm:flex gap-1.5 font-mono text-[10px] flex-shrink-0">
                <div className="bg-gray-950 rounded p-1.5 border border-gray-850 text-center sm:w-16">
                  <div className="text-gray-500 uppercase whitespace-nowrap">Fourn.</div>
                  <div className="text-white font-bold whitespace-nowrap">{(cat.supplierPrice || 0).toFixed(2)}$</div>
                </div>
                <div className="bg-gray-950 rounded p-1.5 border border-gray-850 text-center sm:w-16">
                  <div className="text-gray-500 uppercase whitespace-nowrap">Sous-tr.</div>
                  <div className="text-white font-bold whitespace-nowrap">{cat.pricePerSqFt.toFixed(2)}$</div>
                </div>
                <div className="bg-gray-950 rounded p-1.5 border border-gray-850 text-center sm:w-16">
                  <div className="text-gray-500 uppercase whitespace-nowrap">Client</div>
                  <div className="text-white font-bold whitespace-nowrap">{(cat.clientPrice || 0).toFixed(2)}$</div>
                </div>
              </div>

              <p className={`text-[11px] font-black flex-shrink-0 sm:w-32 text-left sm:text-right ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Marge : {margin >= 0 ? '+' : ''}{margin.toFixed(2)}$/{unitShort(cat.unit)}
              </p>

              {canManage && (
                <div className="flex gap-1.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-850">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1 px-3 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer "${cat.name}" du catalogue de soumission ?`)) {
                        deleteCatalogueMaterial(cat.id);
                      }
                    }}
                    className="p-1 px-3 bg-red-950/45 hover:bg-red-900 text-red-300 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 transition"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Retirer</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
