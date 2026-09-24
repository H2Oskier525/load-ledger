import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type LoadRecipe } from '../data/db';
import { ComponentField, CartridgeInput, componentLabel } from '../ui/ComponentPicker';
import { canonicalCartridge, cartridgeDiameter } from '../catalog/catalog';
import { useSettings } from '../lib/settings';

const NUMS: [keyof LoadRecipe, string][] = [
  ['powder_charge_grains', 'Powder charge (gr)'], ['cartridge_overall_length_inches', 'COAL (in)'], ['base_to_ogive_inches', 'Base to ogive / CBTO (in)'],
  ['bullet_jump_inches', 'Jump to lands (in)'], ['case_firing_count', 'Times fired (case)'], ['neck_tension_inches', 'Neck tension (in)'], ['trim_length_inches', 'Trim length (in)'],
];

function LoadForm({ initial, onDone }: { initial: Partial<LoadRecipe>; onDone: () => void }) {
  const [v, setV] = useState<Partial<LoadRecipe>>(initial);
  const set = (p: Partial<LoadRecipe>) => setV((x) => ({ ...x, ...p }));
  const dia = cartridgeDiameter(v.cartridge);
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); await save('load_recipes', { ...v, cartridge: canonicalCartridge(v.cartridge) }); onDone(); }}>
      <h2>{v.id ? 'Edit load' : 'New load'}</h2>
      <p className="notice small">Recordkeeping only. Always follow published component-manufacturer load data.</p>
      <label className="field"><span>Load name *</span><input required value={v.name || ''} placeholder="e.g. H4350 ladder step 3" onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="field"><span>Cartridge * (matches rifles with this cartridge)</span><CartridgeInput required value={v.cartridge} onChange={(c) => set({ cartridge: c })} /></label>
      <ComponentField type="bullet" diameter={dia} value={v.bullet_id} lotValue={v.bullet_lot_id} onChange={(c, l) => set({ bullet_id: c, bullet_lot_id: l })} />
      <ComponentField type="powder" value={v.powder_id} lotValue={v.powder_lot_id} onChange={(c, l) => set({ powder_id: c, powder_lot_id: l })} />
      <ComponentField type="primer" value={v.primer_id} lotValue={v.primer_lot_id} onChange={(c, l) => set({ primer_id: c, primer_lot_id: l })} />
      <ComponentField type="case" cartridge={canonicalCartridge(v.cartridge)} value={v.case_id} lotValue={v.case_lot_id} onChange={(c, l) => set({ case_id: c, case_lot_id: l })} />
      <div className="grid2">
        {NUMS.map(([k, label]) => <label key={k} className="field"><span>{label}</span><input type="number" inputMode="decimal" step="any" value={(v[k] as number | undefined) ?? ''} onChange={(e) => set({ [k]: e.target.value === '' ? undefined : Number(e.target.value) } as any)} /></label>)}
      </div>
      <label className="field"><span>Prep notes</span><textarea rows={3} value={v.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></label>
      <button className="btn primary">Save load</button>
      <button type="button" className="btn" onClick={onDone}>Cancel</button>
    </form>
  );
}

export default function Loads() {
  const { s } = useSettings();
  const rows = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const [edit, setEdit] = useState<Partial<LoadRecipe> | null>(null);
  if (edit) return <LoadForm initial={edit} onDone={() => setEdit(null)} />;
  const byCart = rows.reduce<Record<string, LoadRecipe[]>>((a, r) => { const k = canonicalCartridge(r.cartridge) || 'No cartridge set'; (a[k] ||= []).push(r); return a; }, {});
  const c = (id?: string) => componentLabel(comps.find((x) => x.id === id));
  return (
    <div className="stack">
      <div className="row"><h2>Loads</h2><button className="btn primary" onClick={() => setEdit({})}>New load</button></div>
      {!rows.length && <p className="muted">No loads yet.</p>}
      {Object.entries(byCart).map(([cart, list]) => (
        <section key={cart}><h3>{cart}</h3>
          {list.map((r) => (
            <div key={r.id} className="card">
              <b>{r.name}</b>
              <div className="muted">{[c(r.bullet_id), c(r.powder_id), r.powder_charge_grains && `${r.powder_charge_grains} gr`, r.cartridge_overall_length_inches && `COAL ${r.cartridge_overall_length_inches}`].filter(Boolean).join(' · ')}</div>
              <div className="chips">
                <button className="btn small primary" onClick={() => setEdit(r)}>Edit</button>
                <button className="btn small" onClick={() => { const { id: _i, created_at: _c, updated_at: _u, _dirty, ...rest } = r; setEdit({ ...rest, name: `${r.name} (copy)` }); }}>Duplicate</button>
                <button className="btn small" onClick={() => (!s.confirmDeletes || confirm('Delete this load?')) && remove('load_recipes', r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
