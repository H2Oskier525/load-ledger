import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, type Component } from '../data/db';
import { useSettings } from '../lib/settings';
import { CARTRIDGES, searchCatalog, type CatalogItem, type CatalogType } from '../catalog/catalog';

const LABEL: Record<CatalogType, string> = { bullet: 'Bullet', powder: 'Powder', primer: 'Primer', case: 'Brass / case' };

/** Adds a catalog item to the user's components (or reuses an existing one). */
export async function addFromCatalog(item: CatalogItem, extra?: Partial<Component>): Promise<string> {
  const existing = alive(await db.components.where('catalog_key').equals(item.key).toArray())[0];
  if (existing) return existing.id;
  const { key, manufacturer, product_name, caliber_or_size, weight_grains, bullet_diameter_inches, bullet_type, type, g1, g7, burn_rank } = item;
  const notes = [g1 && `G1 BC ${g1}`, g7 && `G7 BC ${g7}`, burn_rank && `Hodgdon burn-rate chart #${burn_rank}`].filter(Boolean).join(' · ') || undefined;
  return save('components', { type, manufacturer, product_name, caliber_or_size, weight_grains, bullet_diameter_inches, bullet_type, notes, catalog_key: key, is_quick_add: false, ...extra });
}

export const catalogDetail = (i: CatalogItem) => [i.caliber_or_size, i.bullet_type, i.g1 && `G1 ${i.g1}`, i.g7 && `G7 ${i.g7}`, i.form, i.burn_rank && `burn order #${i.burn_rank}`].filter(Boolean).join(' · ');

export function componentLabel(c?: Component) {
  return c ? `${c.manufacturer ? c.manufacturer + ' ' : ''}${c.product_name}` : '';
}

/** Library search + quick add. Used on the Components screen and to link quick-added items. */
export function LibrarySearch({ type, diameter, cartridge, onPick, onQuickAdd }: { type: CatalogType; diameter?: number; cartridge?: string; onPick: (i: CatalogItem) => void; onQuickAdd?: (text: string) => void }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const res = searchCatalog(type, q, { diameter: all ? undefined : diameter, cartridge });
  return (
    <div className="picker">
      <input autoFocus placeholder={`Search ${LABEL[type].toLowerCase()} library…`} value={q} onChange={(e) => setQ(e.target.value)} />
      {diameter && type === 'bullet' && <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show all diameters (showing {diameter.toFixed(3)}")</label>}
      <div className="results">
        {res.map((i) => <button type="button" key={i.key} className="result" onClick={() => onPick(i)}><b>{i.manufacturer}</b> {i.product_name}<span className="muted"> {catalogDetail(i)}</span></button>)}
        {!res.length && <p className="muted small">No library match.</p>}
      </div>
      {onQuickAdd && q.trim() && <button type="button" className="btn small" onClick={() => onQuickAdd(q.trim())}>Quick add “{q.trim()}” (link to library later)</button>}
    </div>
  );
}

/** Field used inside the load form: choose one of my components, from the library, or quick add. Lot is optional. */
export function ComponentField({ type, value, lotValue, onChange, diameter, cartridge, showLot = true }: { type: CatalogType; value?: string; lotValue?: string; onChange: (componentId?: string, lotId?: string) => void; diameter?: number; cartridge?: string; showLot?: boolean }) {
  const { s } = useSettings();
  const libOn = s.libraryMode === 'on';
  const mine = alive(useLiveQuery(() => db.components.where('type').equals(type).toArray(), [type]));
  const lots = alive(useLiveQuery(async () => (value ? await db.component_lots.where('component_id').equals(value).toArray() : []), [value]));
  const [open, setOpen] = useState(false);
  const cur = mine.find((c) => c.id === value);
  const pick = async (i: CatalogItem) => { onChange(await addFromCatalog(i), undefined); setOpen(false); };
  const quick = async (text: string) => { onChange(await save('components', { type, product_name: text, is_quick_add: true, caliber_or_size: type === 'case' ? cartridge : undefined }), undefined); setOpen(false); };
  const shown = type === 'bullet' && diameter ? mine.filter((c) => !c.bullet_diameter_inches || Math.abs(c.bullet_diameter_inches - diameter) < 0.0015) : mine;
  return (
    <div className="field">
      <span>{LABEL[type]}</span>
      <div className="row">
        <select value={value || ''} onChange={(e) => onChange(e.target.value || undefined, undefined)}>
          <option value="">—</option>
          {shown.map((c) => <option key={c.id} value={c.id}>{componentLabel(c)}{c.is_quick_add ? ' (quick add)' : ''}</option>)}
        </select>
        <button type="button" className="btn small" onClick={() => setOpen(!open)}>{open ? 'Close' : libOn ? 'Library' : '+ Add'}</button>
      </div>
      {open && (libOn ? <LibrarySearch type={type} diameter={diameter} cartridge={cartridge} onPick={pick} onQuickAdd={quick} /> : <QuickOnly onAdd={quick} />)}
      {cur && showLot && (
        <div className="row">
          <select value={lotValue || ''} onChange={(e) => onChange(value, e.target.value || undefined)}>
            <option value="">Lot (optional)</option>
            {lots.map((l) => <option key={l.id} value={l.id}>Lot {l.lot_number}</option>)}
          </select>
          <button type="button" className="btn small" onClick={async () => { const n = prompt('New lot number'); if (n) onChange(value, await save('component_lots', { component_id: value, lot_number: n })); }}>+ Lot</button>
        </div>
      )}
    </div>
  );
}

export function CartridgeInput({ value, onChange, required }: { value?: string; onChange: (v: string) => void; required?: boolean }) {
  const { s, set } = useSettings();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dia, setDia] = useState('');
  const all = [...CARTRIDGES.map((c) => ({ ...c, custom: false })), ...s.customCartridges.map((c) => ({ ...c, custom: true }))];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = all.filter((c) => words.every((w) => `${c.name} ${(c as any).aliases?.join(' ') || ''}`.toLowerCase().includes(w)));
  const exact = all.some((c) => c.name.toLowerCase() === q.trim().toLowerCase());
  const pick = (n: string) => { onChange(n); setOpen(false); setQ(''); };
  const add = () => {
    const name = q.trim(); if (!name) return;
    set({ customCartridges: [...s.customCartridges, { name, bullet_dia: Number(dia) || undefined }] }); setDia('');
    pick(name);
  };
  return (
    <div className="combo">
      <button type="button" className={`combo-btn ${value ? '' : 'muted'}`} onClick={() => setOpen(!open)}>{value || 'Select cartridge…'}<span>▾</span></button>
      <input tabIndex={-1} className="combo-req" required={required} value={value || ''} onChange={() => {}} />
      {open && (
        <div className="picker">
          <input autoFocus placeholder="Search cartridges…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="results">
            {hits.map((c) => <button type="button" key={c.name} className="result" onClick={() => pick(c.name)}>{c.name}{c.bullet_dia ? <span className="muted"> {c.bullet_dia.toFixed(3)}"</span> : null}{c.custom && <span className="muted"> · added by you</span>}</button>)}
            {!hits.length && <p className="muted small">No match.</p>}
          </div>
          {q.trim() && !exact && <div className="row"><input type="number" step="any" inputMode="decimal" placeholder='Bullet dia. (opt., .264)' value={dia} onChange={(e) => setDia(e.target.value)} /><button type="button" className="btn small" onClick={add}>+ Add “{q.trim()}”</button></div>}
        </div>
      )}
    </div>
  );
}

function QuickOnly({ onAdd }: { onAdd: (t: string) => void }) {
  const [q, setQ] = useState('');
  return <div className="row"><input autoFocus placeholder="Name (library is off in Settings)" value={q} onChange={(e) => setQ(e.target.value)} /><button type="button" className="btn small" disabled={!q.trim()} onClick={() => onAdd(q.trim())}>Add</button></div>;
}
