import { BuildNav } from './Build';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type LoadRecipe } from '../data/db';
import { ComponentField, CartridgeInput, componentLabel } from '../ui/ComponentPicker';
import { canonicalCartridge, cartridgeDiameter } from '../catalog/catalog';
import { useSettings, useDetail } from '../lib/settings';
import { ViewSwitch } from '../ui/ViewSwitch';

const NUMS: [keyof LoadRecipe, string, 'essential' | 'expanded' | 'full'][] = [
  ['powder_charge_grains', 'Powder charge (gr)', 'essential'], ['cartridge_overall_length_inches', 'COAL (in)', 'essential'], ['base_to_ogive_inches', 'Base to ogive / CBTO (in)', 'expanded'],
  ['bullet_jump_inches', 'Jump to lands (in)', 'expanded'], ['case_firing_count', 'Times fired (case)', 'expanded'], ['neck_tension_inches', 'Neck tension (in)', 'full'], ['trim_length_inches', 'Trim length (in)', 'full'],
];
const USES = ['Development', 'Target', 'Competition', 'Hunting', 'Plinking'];

function Ladder({ base }: { base: Partial<LoadRecipe> }) {
  const [p, setP] = useState({ start: '', step: '', count: '' });
  const [done, setDone] = useState('');
  const ok = base.name && base.cartridge && Number(p.start) > 0 && Number(p.step) > 0 && Number(p.count) >= 2 && Number(p.count) <= 15;
  return (
    <details className="card"><summary>Build a test ladder (one load per charge step)</summary>
      <p className="muted small">Enter only charges within your published load data. The app just records the steps you choose.</p>
      <div className="grid2">
        <label className="field"><span>Start charge (gr)</span><input type="number" step="any" value={p.start} onChange={(e) => setP({ ...p, start: e.target.value })} /></label>
        <label className="field"><span>Step (gr)</span><input type="number" step="any" value={p.step} onChange={(e) => setP({ ...p, step: e.target.value })} /></label>
        <label className="field"><span>Number of steps</span><input type="number" value={p.count} onChange={(e) => setP({ ...p, count: e.target.value })} /></label>
      </div>
      <button type="button" className="btn small" disabled={!ok} onClick={async () => {
        const n = Number(p.count);
        for (let i = 0; i < n; i++) { const c = Math.round((Number(p.start) + i * Number(p.step)) * 100) / 100; await save('load_recipes', { ...base, cartridge: canonicalCartridge(base.cartridge), name: `${base.name} ${String.fromCharCode(65 + i)} · ${c} gr`, powder_charge_grains: c }); }
        setDone(`Created ${n} loads.`);
      }}>Create ladder loads</button>{done && <span className="muted small"> {done}</span>}
    </details>
  );
}

function LoadForm({ initial, onDone }: { initial: Partial<LoadRecipe>; onDone: () => void }) {
  const [v, setV] = useState<Partial<LoadRecipe>>(initial);
  const set = (p: Partial<LoadRecipe>) => setV((x) => ({ ...x, ...p }));
  const dia = cartridgeDiameter(v.cartridge);
  const { at } = useDetail('build');
  const lots = at('expanded');
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); await save('load_recipes', { ...v, cartridge: canonicalCartridge(v.cartridge) }); onDone(); }}>
      <div className="row"><h2>{v.id ? 'Edit load' : 'New load'}</h2></div><ViewSwitch screen="build" />
      <p className="notice small">Recordkeeping only. Always follow published component-manufacturer load data.</p>
      <label className="field"><span>Load name *</span><input required value={v.name || ''} placeholder="e.g. H4350 ladder step 3" onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="field"><span>Cartridge * (matches rifles with this cartridge)</span><CartridgeInput required value={v.cartridge} onChange={(c) => set({ cartridge: c })} /></label>
      <ComponentField showLot={lots} type="bullet" diameter={dia} value={v.bullet_id} lotValue={v.bullet_lot_id} onChange={(c, l) => set({ bullet_id: c, bullet_lot_id: l })} />
      <ComponentField showLot={lots} type="powder" value={v.powder_id} lotValue={v.powder_lot_id} onChange={(c, l) => set({ powder_id: c, powder_lot_id: l })} />
      <ComponentField showLot={lots} type="primer" value={v.primer_id} lotValue={v.primer_lot_id} onChange={(c, l) => set({ primer_id: c, primer_lot_id: l })} />
      <ComponentField showLot={lots} type="case" cartridge={canonicalCartridge(v.cartridge)} value={v.case_id} lotValue={v.case_lot_id} onChange={(c, l) => set({ case_id: c, case_lot_id: l })} />
      <div className="grid2">
        {NUMS.filter(([, , l]) => at(l)).map(([k, label]) => <label key={k} className="field"><span>{label}</span><input type="number" inputMode="decimal" step="any" value={(v[k] as number | undefined) ?? ''} onChange={(e) => set({ [k]: e.target.value === '' ? undefined : Number(e.target.value) } as any)} /></label>)}
      </div>
      {at('expanded') && <label className="field"><span>Intended use</span><select value={v.intended_use || ''} onChange={(e) => set({ intended_use: e.target.value || undefined })}><option value="">—</option>{USES.map((u) => <option key={u}>{u}</option>)}</select></label>}
      {at('expanded') && !v.id && <Ladder base={v} />}
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
      <BuildNav />
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
