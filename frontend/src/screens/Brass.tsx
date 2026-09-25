import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, alive, save, remove, type ComponentLot } from '../data/db';
import { componentLabel } from '../ui/ComponentPicker';
import { useSettings } from '../lib/settings';
import { BuildNav } from './Build';

export const lotAlert = (l: ComponentLot, type?: string) =>
  type === 'case' && l.retire_after && (l.times_fired ?? 0) >= l.retire_after ? 'Reached retirement firings'
  : type === 'case' && l.retire_after && (l.times_fired ?? 0) >= l.retire_after - 1 ? 'One firing from retirement'
  : l.quantity !== undefined && l.quantity !== null && l.quantity <= (type === 'powder' ? 1 : 20) ? 'Running low' : undefined;

function LotEditor({ lot, isCase, onDone }: { lot: ComponentLot; isCase: boolean; onDone: () => void }) {
  const [v, setV] = useState(lot);
  const num = (k: keyof ComponentLot, label: string) => <label className="field"><span>{label}</span><input type="number" inputMode="decimal" step="any" value={(v[k] as number | undefined) ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>;
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); await save('component_lots', v); onDone(); }}>
      <label className="field"><span>Lot number</span><input value={v.lot_number} onChange={(e) => setV({ ...v, lot_number: e.target.value })} /></label>
      <div className="grid2">
        {num('quantity', isCase ? 'Cases in batch' : 'On hand (count, or lb for powder)')}
        {isCase && num('times_fired', 'Times fired')}
        {isCase && num('last_annealed_after', 'Annealed after firing #')}
        {isCase && num('retire_after', 'Retire after (firings)')}
      </div>
      <label className="field"><span>{isCase ? 'Prep log (sizing, trimming, annealing, primer pockets)' : 'Notes'}</span><textarea rows={3} value={v.prep_notes || ''} onChange={(e) => setV({ ...v, prep_notes: e.target.value })} /></label>
      <button className="btn primary">Save</button><button type="button" className="btn" onClick={onDone}>Cancel</button>
    </form>
  );
}

export default function Brass() {
  const { s } = useSettings();
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const lots = alive(useLiveQuery(() => db.component_lots.toArray()));
  const [edit, setEdit] = useState<ComponentLot | null>(null);
  const [tab, setTab] = useState<'case' | 'inv'>('case');
  if (edit) return <LotEditor lot={edit} isCase={comps.find((c) => c.id === edit.component_id)?.type === 'case'} onDone={() => setEdit(null)} />;
  const cases = comps.filter((c) => c.type === 'case');
  const others = comps.filter((c) => c.type !== 'case');
  const newLot = async (component_id: string) => { const n = prompt('Lot / batch name', 'Batch 1'); if (n) setEdit(await db.component_lots.get(await save('component_lots', { component_id, lot_number: n, times_fired: 0 })) as ComponentLot); };
  return (
    <div className="stack">
      <BuildNav />
      <div className="seg"><button className={tab === 'case' ? 'on' : ''} onClick={() => setTab('case')}>Brass batches</button><button className={tab === 'inv' ? 'on' : ''} onClick={() => setTab('inv')}>Inventory</button></div>
      {tab === 'case' && <>
        {!cases.length && <p className="muted">Add a brass component (Components → Brass) to start tracking batches.</p>}
        {cases.map((c) => (
          <section key={c.id} className="card">
            <div className="row"><b>{componentLabel(c)}</b><button className="btn small" onClick={() => newLot(c.id)}>+ Batch</button></div>
            {lots.filter((l) => l.component_id === c.id).map((l) => { const a = lotAlert(l, 'case'); return (
              <div key={l.id} className="lot">
                <div className="row"><span><b>{l.lot_number}</b> · {l.quantity ?? '?'} cases · fired {l.times_fired ?? 0}×{l.last_annealed_after ? ` · annealed after #${l.last_annealed_after}` : ''}</span>{a && <span className="pill warn">{a}</span>}</div>
                <div className="chips">
                  <button className="btn small primary" onClick={() => save('component_lots', { ...l, times_fired: (l.times_fired ?? 0) + 1 })}>+1 firing</button>
                  <button className="btn small" onClick={() => save('component_lots', { ...l, last_annealed_after: l.times_fired ?? 0 })}>Annealed now</button>
                  <button className="btn small" onClick={() => setEdit(l)}>Edit</button>
                  <button className="btn small" onClick={() => (!s.confirmDeletes || confirm('Delete this batch?')) && remove('component_lots', l.id)}>Delete</button>
                </div>
              </div>); })}
          </section>
        ))}
      </>}
      {tab === 'inv' && <>
        {others.map((c) => (
          <div key={c.id} className="card">
            <div className="row"><b>{componentLabel(c)}</b><span className="muted small">{c.type}</span></div>
            {lots.filter((l) => l.component_id === c.id).map((l) => { const a = lotAlert(l, c.type); return (
              <div key={l.id} className="row lot"><span>Lot {l.lot_number} · on hand {l.quantity ?? '—'}{c.type === 'powder' ? ' lb' : ''}</span>{a && <span className="pill warn">{a}</span>}<button className="btn small" onClick={() => setEdit(l)}>Edit</button></div>); })}
            <button className="pill add" onClick={() => newLot(c.id)}>+ lot</button>
          </div>
        ))}
        {!others.length && <p className="muted">Add components first.</p>}
      </>}
    </div>
  );
}
