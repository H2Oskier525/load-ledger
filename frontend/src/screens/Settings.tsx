import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSettings, type Settings as S } from '../lib/settings';
import { supabase } from '../lib/supabase';
import { onSync, syncNow, type SyncState } from '../lib/sync';
import { db, alive } from '../data/db';
import { velocityStats } from '../lib/stats';
import { DEVICE_LABELS } from '../lib/chrono';

function Opt<K extends keyof S>({ k, label, options }: { k: K; label: string; options: [S[K], string][] }) {
  const { s, set } = useSettings();
  return (
    <div className="setting"><span>{label}</span>
      <div className="seg small">{options.map(([v, l]) => <button key={String(v)} className={s[k] === v ? 'on' : ''} onClick={() => set({ [k]: v } as Partial<S>)}>{l}</button>)}</div>
    </div>
  );
}
function Toggle({ k, label, hint }: { k: 'keepScreenAwake' | 'confirmDeletes'; label: string; hint?: string }) {
  const { s, set } = useSettings();
  return <label className="setting"><span>{label}{hint && <small className="muted"><br />{hint}</small>}</span><input type="checkbox" className="switch" checked={s[k]} onChange={(e) => set({ [k]: e.target.checked })} /></label>;
}
const csv = (rows: (string | number | undefined)[][]) => rows.map((r) => r.map((c) => (c === undefined ? '' : /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
const download = (name: string, text: string, type = 'text/csv') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };

export default function Settings() {
  const { s, set } = useSettings();
  const [email, setEmail] = useState('');
  const [sync, setSync] = useState<SyncState>({ status: 'idle', pending: 0 });
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('');
  const counts = useLiveQuery(async () => ({ rifles: alive(await db.rifles.toArray()).length, loads: alive(await db.load_recipes.toArray()).length, sessions: alive(await db.range_sessions.toArray()).length, strings: alive(await db.firing_strings.toArray()).length, shots: alive(await db.shots.toArray()).length, photos: await db.photos.count() }));
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || '')); return onSync(setSync); }, []);
  const isAdmin = email.toLowerCase() === 'justin@thesells.net';

  const exportStrings = async () => {
    const [sessions, strings, shots, loads, rifles] = await Promise.all([db.range_sessions.toArray(), db.firing_strings.toArray(), db.shots.toArray(), db.load_recipes.toArray(), db.rifles.toArray()].map((p) => p.then((x: any[]) => alive(x)))) as any[][];
    const rows: (string | number | undefined)[][] = [['date', 'range', 'rifle', 'string', 'load', 'cartridge', 'charge_gr', 'coal_in', 'cbto_in', 'jump_in', 'distance_yd', 'shots', 'avg_fps', 'sd_fps', 'es_fps', 'group_in', 'velocities_fps']];
    for (const f of strings) {
      const se = sessions.find((x) => x.id === f.range_session_id); const l = loads.find((x) => x.id === f.load_recipe_id); const r = rifles.find((x) => x.id === se?.rifle_id);
      const v = shots.filter((x) => x.firing_string_id === f.id && !x.is_excluded && x.muzzle_velocity_fps).sort((a, b) => a.shot_number - b.shot_number).map((x) => x.muzzle_velocity_fps);
      const st = velocityStats(v);
      rows.push([se?.session_date, se?.range_name, r?.name, f.label, l?.name, l?.cartridge, l?.powder_charge_grains, l?.cartridge_overall_length_inches, l?.base_to_ogive_inches, l?.bullet_jump_inches, f.target_distance_yards, st.n, st.avg?.toFixed(1), st.sd?.toFixed(2), st.es?.toFixed(1), f.group_size_inches, v.join(' ')]);
    }
    download(`load-ledger-strings-${new Date().toISOString().slice(0, 10)}.csv`, csv(rows));
  };
  const backup = async () => {
    const out: Record<string, unknown[]> = {};
    for (const t of ['rifles', 'components', 'component_lots', 'load_recipes', 'range_sessions', 'firing_strings', 'shots', 'environmental_snapshots']) out[t] = await db.table(t).toArray();
    download(`load-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 1), 'application/json');
  };

  return (
    <div className="stack settings">
      <h2>Settings</h2>

      <section className="card"><h3>Display</h3>
        <Opt k="theme" label="Theme" options={[['dark', 'Dark'], ['light', 'Light'], ['sun', 'Bright sun'], ['system', 'Auto']]} />
        <Opt k="textSize" label="Text size" options={[['normal', 'Normal'], ['large', 'Large']]} />
        <Opt k="density" label="Layout" options={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} />
      </section>

      <section className="card"><h3>Units</h3>
        <Opt k="velocityUnit" label="Velocity" options={[['fps', 'fps'], ['mps', 'm/s']]} />
        <Opt k="groupUnit" label="Group size" options={[['moa', 'MOA'], ['mil', 'MIL'], ['in', 'Inches']]} />
      </section>

      <section className="card"><h3>Range defaults</h3>
        <label className="setting"><span>Default target distance (yd)</span><input type="number" inputMode="numeric" value={s.defaultDistanceYards} onChange={(e) => set({ defaultDistanceYards: Number(e.target.value) || 100 })} /></label>
        <label className="setting"><span>Planned shots per string</span><input type="number" inputMode="numeric" value={s.defaultShotsPerString} onChange={(e) => set({ defaultShotsPerString: Number(e.target.value) || 0 })} /></label>
        <Toggle k="keepScreenAwake" label="Keep screen on at the range" hint="While a session or string is open" />
        <Toggle k="confirmDeletes" label="Ask before deleting" />
      </section>

      <section className="card"><h3>My data</h3>
        <div className="grid2"><Link className="btn" to="/rifles">Rifles ({counts?.rifles ?? 0})</Link><Link className="btn" to="/components">Components</Link><Link className="btn" to="/loads">Loads ({counts?.loads ?? 0})</Link><Link className="btn" to="/analytics">Charts</Link></div>
        <p className="muted small">On this phone: {counts?.sessions ?? 0} sessions · {counts?.strings ?? 0} strings · {counts?.shots ?? 0} shots · {counts?.photos ?? 0} target photos</p>
        <div className="chips"><button className="btn small" onClick={exportStrings}>Export strings (CSV)</button><button className="btn small" onClick={backup}>Full backup (JSON)</button></div>
      </section>

      <section className="card"><h3>Sync</h3>
        <p className="muted">Status: <b>{sync.status === 'idle' ? (sync.pending ? `${sync.pending} waiting` : 'Up to date') : sync.status}</b>{sync.lastSync && ` · last synced ${new Date(sync.lastSync).toLocaleTimeString()}`}</p>
        {sync.error && <p className="notice small">{sync.error}</p>}
        <p className="muted small">Everything saves on this phone first and uploads when you have signal.</p>
        <button className="btn small" onClick={() => syncNow()}>Sync now</button>
      </section>

      <section className="card"><h3>Chronographs</h3>
        <p className="muted small">Import a CSV export from {Object.values(DEVICE_LABELS).join(', ')} on any string. Live Bluetooth connections will come with the App Store / Google Play versions once each manufacturer's protocol is available.</p>
      </section>

      <section className="card"><h3>Account</h3>
        <p className="muted">Signed in as <b>{email}</b></p>
        {isAdmin && <Link className="btn small" to="/admin">Access requests</Link>}
        <form className="row" onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.updateUser({ password: pw }); setMsg(error ? error.message : 'Password updated.'); setPw(''); }}>
          <input type="password" minLength={8} placeholder="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn small" disabled={pw.length < 8}>Change</button>
        </form>
        {msg && <p className="muted small">{msg}</p>}
        <button className="btn danger" onClick={() => confirm('Sign out? Unsynced records stay on this phone.') && supabase.auth.signOut()}>Sign out</button>
      </section>

      <section className="card"><h3>About</h3>
        <p className="muted small">Load Ledger v0.3 · web preview</p>
        <p className="muted small">Load Ledger is a personal recordkeeping and data-analysis tool. It does not provide load data, pressure predictions, safety limits, substitutions, or ammunition recommendations. Always follow published component-manufacturer load data and safe reloading practices.</p>
      </section>
    </div>
  );
}
