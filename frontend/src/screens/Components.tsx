import { BuildNav } from './Build';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type Component } from '../data/db';
import { RecordForm, type Field } from '../lib/form';
import { LibrarySearch, addFromCatalog, componentLabel } from '../ui/ComponentPicker';
import { useSettings } from '../lib/settings';
import type { CatalogType } from '../catalog/catalog';

const TYPES: { t: CatalogType; label: string }[] = [{ t: 'bullet', label: 'Bullets' }, { t: 'powder', label: 'Powders' }, { t: 'primer', label: 'Primers' }, { t: 'case', label: 'Brass' }];
const fieldsFor = (t: CatalogType): Field[] => [
  { name: 'manufacturer', label: 'Manufacturer', placeholder: t === 'bullet' ? 'Hornady' : t === 'powder' ? 'Hodgdon' : t === 'primer' ? 'CCI' : 'Lapua' },
  { name: 'product_name', label: t === 'bullet' ? 'Bullet (line and weight)' : t === 'powder' ? 'Powder name' : t === 'primer' ? 'Primer model' : 'Case / headstamp', required: true, placeholder: t === 'bullet' ? 'ELD Match 140 gr' : t === 'powder' ? 'H4350' : t === 'primer' ? 'BR-2' : '6.5 Creedmoor brass' },
  ...(t === 'bullet' ? [{ name: 'weight_grains', label: 'Weight (gr)', type: 'number' as const }, { name: 'bullet_diameter_inches', label: 'Diameter (in)', type: 'number' as const, placeholder: '.264' }, { name: 'bullet_type', label: 'Type', placeholder: 'Match / Hunting' }] : []),
  ...(t === 'primer' || t === 'case' ? [{ name: 'caliber_or_size', label: t === 'primer' ? 'Size' : 'Cartridge', placeholder: t === 'primer' ? 'Small Rifle' : '6.5 Creedmoor' }] : []),
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Components() {
  const { s } = useSettings();
  const [tab, setTab] = useState<CatalogType>('bullet');
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const lots = alive(useLiveQuery(() => db.component_lots.toArray()));
  const [edit, setEdit] = useState<Partial<Component> | null>(null);
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState<Component | null>(null);
  const [msg, setMsg] = useState('');

  if (edit) return (
    <div><h2>{edit.id ? 'Edit' : 'New'} {tab}</h2>
      <RecordForm<Component> fields={fieldsFor(edit.type || tab)} initial={edit} onSubmit={async (v) => { await save('components', { ...edit, ...v, type: edit.type || tab }); setEdit(null); }} />
      <button className="btn" onClick={() => setEdit(null)}>Cancel</button></div>
  );
  if (linking) return (
    <div className="stack"><h2>Link to library</h2><p className="muted">Quick-added: <b>{componentLabel(linking)}</b>. Pick the matching library item; your loads and lots stay attached.</p>
      <LibrarySearch type={linking.type} onPick={async (i) => { const { key, ...rest } = i; await save('components', { ...linking, ...rest, catalog_key: key, is_quick_add: false }); setLinking(null); }} />
      <button className="btn" onClick={() => setLinking(null)}>Cancel</button></div>
  );

  const list = comps.filter((c) => c.type === tab);
  return (
    <div className="stack">
      <BuildNav />
      <h2>Components</h2>
      <div className="seg">{TYPES.map(({ t, label }) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); setAdding(false); }}>{label}</button>)}</div>
      {adding ? (
        <div className="card stack">
          <LibrarySearch type={tab} onPick={async (i) => { await addFromCatalog(i); setMsg(`Added ${i.manufacturer} ${i.product_name}`); }} onQuickAdd={async (text) => { await save('components', { type: tab, product_name: text, is_quick_add: true }); setMsg(`Quick-added “${text}”`); }} />
          {msg && <p className="muted small">{msg}</p>}
          <div className="chips"><button className="btn small" onClick={() => setEdit({ type: tab })}>Enter details manually</button><button className="btn small" onClick={() => { setAdding(false); setMsg(''); }}>Done</button></div>
        </div>
      ) : <button className="btn primary" onClick={() => setAdding(true)}>Add {TYPES.find((x) => x.t === tab)!.label.toLowerCase()}</button>}
      {!list.length && !adding && <p className="muted">None yet. Add from the library or quick add by name.</p>}
      {list.map((c) => (
        <div key={c.id} className="card">
          <div className="row"><div><b>{componentLabel(c)}</b><div className="muted">{[c.caliber_or_size, c.weight_grains && `${c.weight_grains} gr`, c.bullet_type].filter(Boolean).join(' · ')}</div></div>
            {c.is_quick_add && <span className="pill warn">Not linked</span>}</div>
          <div className="chips">
            {lots.filter((l) => l.component_id === c.id).map((l) => <span key={l.id} className="pill">Lot {l.lot_number}</span>)}
            <button className="pill add" onClick={async () => { const n = prompt('Lot number'); if (n) await save('component_lots', { component_id: c.id, lot_number: n }); }}>+ lot</button>
          </div>
          <div className="chips">
            <button className="btn small" onClick={() => setEdit(c)}>Edit</button>
            {c.is_quick_add && <button className="btn small" onClick={() => setLinking(c)}>Link to library</button>}
            <button className="btn small" onClick={() => (!s.confirmDeletes || confirm('Delete this component?')) && remove('components', c.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
