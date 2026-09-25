import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { db, alive } from '../data/db';
import { velocityStats, moa, mil, vel, velSd, group, velLabel } from '../lib/stats';
import { useSettings, useDetail } from '../lib/settings';
import { ViewSwitch } from '../ui/ViewSwitch';
import { componentLabel } from '../ui/ComponentPicker';
import { canonicalCartridge } from '../catalog/catalog';

const METRICS = { avg: 'Avg velocity', sd: 'SD', es: 'ES', moa: 'Group size' } as const;
const XS = { powder_charge_grains: 'Charge (gr)', bullet_jump_inches: 'Jump (in)', base_to_ogive_inches: 'CBTO (in)', case_firing_count: 'Case firings' } as const;
const confidence = (n: number) => (n >= 20 ? ['Stronger', 'ok'] : n >= 10 ? ['Reasonable', 'ok'] : n >= 5 ? ['Early look', 'warn'] : ['Too few shots', 'warn']);

export default function Analytics() {
  const strings = alive(useLiveQuery(() => db.firing_strings.toArray()));
  const shots = alive(useLiveQuery(() => db.shots.toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const rifles = alive(useLiveQuery(() => db.rifles.toArray()));
  const sessions = alive(useLiveQuery(() => db.range_sessions.toArray()));
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const { s } = useSettings();
  const { at, show } = useDetail('analyze');
  const [rifle, setRifle] = useState(''); const [cart, setCart] = useState('');
  const [f2, setF2] = useState({ powder: '', bullet: '', brass: '', min: '', max: '', dist: '' });
  const [y, setY] = useState<keyof typeof METRICS>('sd');
  const [x, setX] = useState<keyof typeof XS>('powder_charge_grains');
  const [rank, setRank] = useState<'sd' | 'group'>('sd');
  const brandOf = (id?: string) => comps.find((c) => c.id === id)?.manufacturer || componentLabel(comps.find((c) => c.id === id));

  const rows = useMemo(() => strings.map((f) => {
    const load = loads.find((l) => l.id === f.load_recipe_id);
    const v = shots.filter((q) => q.firing_string_id === f.id && !q.is_excluded && q.muzzle_velocity_fps).map((q) => q.muzzle_velocity_fps!);
    const st = velocityStats(v);
    const g = s.groupUnit === 'mil' ? mil(f.group_size_inches, f.target_distance_yards) : s.groupUnit === 'in' ? f.group_size_inches : moa(f.group_size_inches, f.target_distance_yards);
    const k = s.velocityUnit === 'mps' ? 0.3048 : 1;
    return { f, load, v, n: st.n, avgRaw: st.avg, sdRaw: st.sd, esRaw: st.es, avg: st.avg && st.avg * k, sd: st.sd && st.sd * k, es: st.es && st.es * k, moa: g, moaRaw: moa(f.group_size_inches, f.target_distance_yards), rifleId: sessions.find((z) => z.id === f.range_session_id)?.rifle_id };
  }).filter((r) => r.load && (!rifle || r.rifleId === rifle) && (!cart || canonicalCartridge(r.load.cartridge) === cart)
    && (!f2.powder || r.load.powder_id === f2.powder) && (!f2.bullet || r.load.bullet_id === f2.bullet) && (!f2.brass || brandOf(r.load.case_id) === f2.brass)
    && (!f2.min || (r.load.powder_charge_grains ?? -1) >= Number(f2.min)) && (!f2.max || (r.load.powder_charge_grains ?? 1e9) <= Number(f2.max))
    && (!f2.dist || r.f.target_distance_yards === Number(f2.dist))), [strings, shots, loads, rifle, cart, sessions, s, f2, comps]);

  // Per-load summary: all shots across strings combined.
  const leaders = useMemo(() => {
    const by: Record<string, typeof rows> = {};
    rows.forEach((r) => (by[r.load!.id] ||= []).push(r));
    return Object.values(by).map((rs) => {
      const st = velocityStats(rs.flatMap((r) => r.v));
      const gs = rs.map((r) => r.moaRaw).filter((m): m is number => m !== undefined);
      const gIn = rs.map((r) => r.f.group_size_inches).filter((m): m is number => m !== undefined);
      return { load: rs[0].load!, strings: rs.length, n: st.n, avg: st.avg, sd: st.sd, es: st.es, groupMoa: gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : undefined, groupIn: gIn.length ? gIn.reduce((a, b) => a + b, 0) / gIn.length : undefined, dist: rs[0].f.target_distance_yards };
    }).sort((a, b) => (rank === 'sd' ? (a.sd ?? 1e9) - (b.sd ?? 1e9) : (a.groupMoa ?? 1e9) - (b.groupMoa ?? 1e9)));
  }, [rows, rank]);

  const data = rows.map((r) => ({ x: r.load?.[x], y: r[y], name: r.load?.name })).filter((d) => d.x != null && d.y != null);
  const carts = [...new Set(loads.map((l) => canonicalCartridge(l.cartridge)).filter(Boolean))] as string[];
  const powders = comps.filter((c) => c.type === 'powder'), bullets = comps.filter((c) => c.type === 'bullet');
  const brands = [...new Set(comps.filter((c) => c.type === 'case').map((c) => c.manufacturer || c.product_name))];
  const exportCsv = () => {
    const head = ['load', 'string', 'n', 'avg_fps', 'sd_fps', 'es_fps', 'group_in', 'distance_yd', 'charge_gr', 'jump_in', 'cbto_in', 'case_firings'];
    const body = rows.map((r) => [r.load?.name, r.f.label, r.n, r.avgRaw?.toFixed(1), r.sdRaw?.toFixed(2), r.esRaw?.toFixed(1), r.f.group_size_inches, r.f.target_distance_yards, r.load?.powder_charge_grains, r.load?.bullet_jump_inches, r.load?.base_to_ogive_inches, r.load?.case_firing_count].map((c) => (c ?? '')).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' })); a.download = 'load-ledger-analysis.csv'; a.click();
  };

  return (
    <div className="stack">
      <h2>Analyze</h2>
      <ViewSwitch screen="analyze" />
      <div className="grid2">
        <select value={rifle} onChange={(e) => setRifle(e.target.value)}><option value="">All rifles</option>{rifles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select value={cart} onChange={(e) => setCart(e.target.value)}><option value="">All cartridges</option>{carts.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {show('filters') && (
        <details className="card" open><summary>More filters</summary>
          <div className="grid2">
            <select value={f2.powder} onChange={(e) => setF2({ ...f2, powder: e.target.value })}><option value="">Any powder</option>{powders.map((c) => <option key={c.id} value={c.id}>{componentLabel(c)}</option>)}</select>
            <select value={f2.bullet} onChange={(e) => setF2({ ...f2, bullet: e.target.value })}><option value="">Any bullet</option>{bullets.map((c) => <option key={c.id} value={c.id}>{componentLabel(c)}</option>)}</select>
            <select value={f2.brass} onChange={(e) => setF2({ ...f2, brass: e.target.value })}><option value="">Any brass</option>{brands.map((b) => <option key={b}>{b}</option>)}</select>
            <input type="number" inputMode="numeric" placeholder="Distance (yd)" value={f2.dist} onChange={(e) => setF2({ ...f2, dist: e.target.value })} />
            <input type="number" step="any" placeholder="Min charge (gr)" value={f2.min} onChange={(e) => setF2({ ...f2, min: e.target.value })} />
            <input type="number" step="any" placeholder="Max charge (gr)" value={f2.max} onChange={(e) => setF2({ ...f2, max: e.target.value })} />
          </div>
        </details>
      )}

      {show('leaderboard') && <section>
        <div className="row"><h3>Which load performed best?</h3>
          <div className="seg small"><button className={rank === 'sd' ? 'on' : ''} onClick={() => setRank('sd')}>Lowest SD</button><button className={rank === 'group' ? 'on' : ''} onClick={() => setRank('group')}>Smallest group</button></div></div>
        {!leaders.length && <p className="muted">Record strings with a load selected to compare loads.</p>}
        {leaders.map((l, i) => { const [c, cls] = confidence(l.n); return (
          <div key={l.load.id} className={`card ${i === 0 ? 'leader' : ''}`}>
            <div className="row"><b>{i === 0 ? 'Current leader · ' : `${i + 1}. `}{l.load.name}</b><span className={`pill ${cls}`}>{c}</span></div>
            <div className="stats"><span>{l.n} shots / {l.strings} strings</span><span>Avg {vel(l.avg, s)} {velLabel(s)}</span><span>SD {velSd(l.sd, s)}</span><span>ES {vel(l.es, s)}</span><span>{s.groupUnit === 'in' ? group(l.groupIn, l.dist, s) : s.groupUnit === 'mil' ? `${l.groupMoa !== undefined ? (l.groupMoa * 0.2909).toFixed(2) : '—'} mil` : `${l.groupMoa?.toFixed(2) ?? '—'} MOA`} avg</span></div>
          </div>); })}
      </section>}

      {(show('trends') || show('table')) && <>
        {show('trends') && <><h3>Trends</h3>
        <div className="grid2">
          <select value={y} onChange={(e) => setY(e.target.value as any)}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v} ({k === 'moa' ? s.groupUnit.toUpperCase() : velLabel(s)})</option>)}</select>
          <select value={x} onChange={(e) => setX(e.target.value as any)}>{Object.entries(XS).map(([k, v]) => <option key={k} value={k}>vs {v}</option>)}</select>
        </div>
        <div className="chart">
          {data.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis type="number" dataKey="x" name={XS[x]} domain={['auto', 'auto']} stroke="var(--muted)" />
                <YAxis type="number" dataKey="y" name={METRICS[y]} domain={['auto', 'auto']} stroke="var(--muted)" />
                <Tooltip formatter={(v: any) => (typeof v === 'number' ? v.toFixed(2) : v)} />
                <Scatter data={data} fill="var(--accent)" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : <p className="muted">Not enough data for this chart yet.</p>}
        </div></>}
        {show('table') && <table className="table">
          <thead><tr><th>Load</th><th>n</th>{show('col_avg') && <th>Avg</th>}{show('col_sd') && <th>SD</th>}{show('col_es') && <th>ES</th>}{show('col_group') && <th>Group</th>}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.f.id}><td>{r.load?.name}{at('full') && <small className="muted"><br />{r.f.label}</small>}</td><td>{r.n}</td>{show('col_avg') && <td>{vel(r.avgRaw, s)}</td>}{show('col_sd') && <td>{velSd(r.sdRaw, s)}</td>}{show('col_es') && <td>{vel(r.esRaw, s)}</td>}{show('col_group') && <td>{group(r.f.group_size_inches, r.f.target_distance_yards, s)}</td>}</tr>)}</tbody>
        </table>}
      </>}
      {show('export') && <button className="btn small" onClick={exportCsv}>Export this view (CSV)</button>}
      <p className="muted small">Patterns in your own recorded data only. Not load advice.</p>
    </div>
  );
}
