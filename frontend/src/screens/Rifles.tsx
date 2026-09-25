import { BuildNav } from './Build';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type Rifle } from '../data/db';
import { CartridgeInput } from '../ui/ComponentPicker';
import { canonicalCartridge, sameCartridge } from '../catalog/catalog';
import { useSettings } from '../lib/settings';

const F: [keyof Rifle, string, string?][] = [['manufacturer', 'Manufacturer'], ['model', 'Model'], ['barrel_length_inches', 'Barrel length (in)', 'n'], ['twist_rate', 'Twist rate (e.g. 1:8)'], ['barrel_round_count', 'Barrel round count', 'n']];

export default function Rifles() {
  const { s } = useSettings();
  const rows = alive(useLiveQuery(() => db.rifles.toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const [edit, setEdit] = useState<Partial<Rifle> | null>(null);
  if (edit) return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); const cart = canonicalCartridge(edit.cartridge || edit.caliber); await save('rifles', { ...edit, cartridge: cart, caliber: cart }); setEdit(null); }}>
      <h2>{edit.id ? 'Edit rifle' : 'New rifle'}</h2>
      <label className="field"><span>Name *</span><input required value={edit.name || ''} placeholder="e.g. Bergara B-14 HMR" onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
      <label className="field"><span>Cartridge *</span><CartridgeInput required value={edit.cartridge || edit.caliber} onChange={(c) => setEdit({ ...edit, cartridge: c })} /></label>
      {F.map(([k, label, t]) => <label key={k} className="field"><span>{label}</span><input type={t ? 'number' : 'text'} inputMode={t ? 'decimal' : undefined} step="any" value={(edit[k] as any) ?? ''} onChange={(e) => setEdit({ ...edit, [k]: t ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value })} /></label>)}
      <label className="field"><span>Notes</span><textarea rows={3} value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
      <button className="btn primary">Save rifle</button><button type="button" className="btn" onClick={() => setEdit(null)}>Cancel</button>
    </form>
  );
  return (
    <div className="stack">
      <BuildNav />
      <div className="row"><h2>Rifles</h2><button className="btn primary" onClick={() => setEdit({})}>Add rifle</button></div>
      {rows.map((r) => (
        <div key={r.id} className="card">
          <b>{r.name}</b><div className="muted">{[r.cartridge || r.caliber, r.twist_rate, r.barrel_length_inches && `${r.barrel_length_inches}"`].filter(Boolean).join(' · ')}</div>
          <div className="muted small">{loads.filter((l) => sameCartridge(l.cartridge, r.cartridge || r.caliber)).length} loads available for this cartridge</div>
          <div className="chips"><button className="btn small primary" onClick={() => setEdit(r)}>Edit</button><button className="btn small" onClick={() => (!s.confirmDeletes || confirm('Delete this rifle?')) && remove('rifles', r.id)}>Delete</button></div>
        </div>
      ))}
    </div>
  );
}
