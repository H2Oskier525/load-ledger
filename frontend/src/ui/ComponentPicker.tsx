import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, type Component } from '../data/db';
import { searchCatalog, type CatalogItem, type CatalogType } from '../catalog/catalog';

const LABEL: Record<CatalogType, string> = { bullet: 'Bullet', powder: 'Powder', primer: 'Primer', case: 'Brass / case' };

/** Adds a catalog item to the user's components (or reuses an existing one). */
export async function addFromCatalog(item: CatalogItem, extra?: Partial<Component>): Promise<string> {
  const existing = alive(await db.components.where('catalog_key').equals(item.key).toArray())[0];
  if (existing) return existing.id;
  const { key, ...rest } = item;
  return save('components', { ...rest, catalog_key: key, is_quick_add: false, ...extra });
}

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
        {res.map((i) => <button type="button" key={i.key} className="result" onClick={() => onPick(i)}><b>{i.manufacturer}</b> {i.product_name}<span className="muted"> {[i.caliber_or_size, i.bullet_type].filter(Boolean).join(' · ')}</span></button>)}
        {!res.length && <p className="muted small">No library match.</p>}
      </div>
      {onQuickAdd && q.trim() && <button type="button" className="btn small" onClick={() => onQuickAdd(q.trim())}>Quick add “{q.trim()}” (link to library later)</button>}
    </div>
  );
}

/** Field used inside the load form: choose one of my components, from the library, or quick add. Lot is optional. */
export function ComponentField({ type, value, lotValue, onChange, diameter, cartridge }: { type: CatalogType; value?: string; lotValue?: string; onChange: (componentId?: string, lotId?: string) => void; diameter?: number; cartridge?: string }) {
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
        <button type="button" className="btn small" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Library'}</button>
      </div>
      {open && <LibrarySearch type={type} diameter={diameter} cartridge={cartridge} onPick={pick} onQuickAdd={quick} />}
      {cur && (
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
  return <input list="cartridge-list" required={required} placeholder="e.g. 6.5 Creedmoor" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}
