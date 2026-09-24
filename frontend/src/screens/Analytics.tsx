import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { db, alive } from '../data/db';
import { velocityStats, moa, fmt } from '../lib/stats';

const METRICS = { avg: 'Avg velocity (fps)', sd: 'SD (fps)', es: 'ES (fps)', moa: 'Group (MOA)' } as const;
const XS = { powder_charge_grains: 'Charge (gr)', bullet_jump_inches: 'Jump (in)', base_to_ogive_inches: 'CBTO (in)' } as const;

export default function Analytics() {
  const strings = alive(useLiveQuery(() => db.firing_strings.toArray()));
  const shots = alive(useLiveQuery(() => db.shots.toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const rifles = alive(useLiveQuery(() => db.rifles.toArray()));
  const [rifle, setRifle] = useState('');
  const [y, setY] = useState<keyof typeof METRICS>('sd');
  const [x, setX] = useState<keyof typeof XS>('powder_charge_grains');
  const rows = useMemo(() => strings.map((f) => {
    const load = loads.find((l) => l.id === f.load_recipe_id);
    const st = velocityStats(shots.filter((s) => s.firing_string_id === f.id && !s.is_excluded && s.muzzle_velocity_fps).map((s) => s.muzzle_velocity_fps!));
    return { f, load, ...st, moa: moa(f.group_size_inches, f.target_distance_yards) };
  }).filter((r) => r.load && (!rifle || r.load.rifle_id === rifle)), [strings, shots, loads, rifle]);
  const data = rows.map((r) => ({ x: r.load?.[x], y: r[y], name: r.load?.name })).filter((d) => d.x != null && d.y != null);
  return (
    <div className="stack">
      <h2>Analytics</h2>
      <div className="grid2">
        <select value={rifle} onChange={(e) => setRifle(e.target.value)}><option value="">All rifles</option>{rifles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select value={y} onChange={(e) => setY(e.target.value as any)}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={x} onChange={(e) => setX(e.target.value as any)}>{Object.entries(XS).map(([k, v]) => <option key={k} value={k}>vs {v}</option>)}</select>
      </div>
      <div className="chart">
        {data.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" dataKey="x" name={XS[x]} domain={['auto', 'auto']} stroke="#aaa" />
              <YAxis type="number" dataKey="y" name={METRICS[y]} domain={['auto', 'auto']} stroke="#aaa" />
              <Tooltip formatter={(v: any) => (typeof v === 'number' ? v.toFixed(2) : v)} />
              <Scatter data={data} fill="#f5a524" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : <p className="muted">Record strings with a load recipe to see charts.</p>}
      </div>
      <table className="table">
        <thead><tr><th>Load</th><th>n</th><th>Avg</th><th>SD</th><th>ES</th><th>MOA</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.f.id}><td>{r.load?.name}</td><td>{r.n}</td><td>{fmt(r.avg, 0)}</td><td>{fmt(r.sd)}</td><td>{fmt(r.es, 0)}</td><td>{fmt(r.moa, 2)}</td></tr>)}</tbody>
      </table>
      <p className="muted small">Patterns in your own recorded data only. Not load advice.</p>
    </div>
  );
}
