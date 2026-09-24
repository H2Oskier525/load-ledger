import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type FiringString, type EnvSnapshot } from '../data/db';
import { RecordForm } from '../lib/form';
import { useLoadOptions } from '../lib/lookups';
import { velocityStats, vel, velSd, velLabel, group, fmt } from '../lib/stats';
import { useSettings, useWakeLock } from '../lib/settings';
import { parseChronoCsv, DEVICE_LABELS, type ChronoDevice } from '../lib/chrono';

export default function StringDetail() {
  const { id } = useParams();
  const f = useLiveQuery(() => db.firing_strings.get(id!), [id]);
  const shots = alive(useLiveQuery(() => db.shots.where('firing_string_id').equals(id!).sortBy('shot_number'), [id]));
  const env = alive(useLiveQuery(() => db.environmental_snapshots.where('firing_string_id').equals(id!).toArray(), [id]));
  const sess = useLiveQuery(async () => (f ? await db.range_sessions.get(f.range_session_id) : undefined), [f?.range_session_id]);
  const { cartridge, options: loads } = useLoadOptions(sess?.rifle_id);
  const { s: st8 } = useSettings();
  useWakeLock(st8.keepScreenAwake);
  const [velIn, setVel] = useState('');
  const [msg, setMsg] = useState('');
  const [device, setDevice] = useState<ChronoDevice | ''>('');
  const velRef = useRef<HTMLInputElement>(null);
  if (!f) return <p>Loading…</p>;
  const st = velocityStats(shots.filter((s) => !s.is_excluded && s.muzzle_velocity_fps).map((s) => s.muzzle_velocity_fps!));
  const nextNo = (shots.at(-1)?.shot_number || 0) + 1;

  const addShot = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = Number(velIn);
    if (!raw) return;
    const v = st8.velocityUnit === 'mps' ? Math.round((raw / 0.3048) * 10) / 10 : raw;
    await save('shots', { firing_string_id: f.id, shot_number: nextNo, muzzle_velocity_fps: v, is_excluded: false, source: 'manual' });
    setVel(''); velRef.current?.focus();
  };
  const importCsv = async (file: File) => {
    try {
      const r = parseChronoCsv(await file.text(), device || undefined);
      if (shots.length && !confirm(`Add ${r.shots.length} shots to the ${shots.length} already here?`)) return;
      let n = nextNo;
      for (const s of r.shots) await save('shots', { firing_string_id: f.id, shot_number: n++, muzzle_velocity_fps: s.muzzle_velocity_fps, is_excluded: false, source: `${r.device}_csv` as any });
      setMsg(`Imported ${r.shots.length} shots from ${DEVICE_LABELS[r.device]}${r.series ? ` series ${r.series}` : ''}${r.units === 'mps' ? ' (converted from m/s)' : ''}.`);
    } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="stack">
      <Link to={`/sessions/${f.range_session_id}`} className="link">← Session</Link>
      <h2>{f.label}</h2>
      <div className="stats big"><span>n {st.n}{st8.defaultShotsPerString ? `/${st8.defaultShotsPerString}` : ''}</span><span>Avg {vel(st.avg, st8)}</span><span>SD {velSd(st.sd, st8)}</span><span>ES {vel(st.es, st8)}</span><span className="muted">{velLabel(st8)}</span></div>

      <form className="shot-entry" onSubmit={addShot}>
        <input ref={velRef} type="number" inputMode="decimal" step="any" placeholder={`Shot ${nextNo} velocity (${velLabel(st8)})`} value={velIn} onChange={(e) => setVel(e.target.value)} />
        <button className="btn primary big">Add shot</button>
      </form>

      <div className="shots">
        {shots.map((s) => (
          <div key={s.id} className={`shot ${s.is_excluded ? 'excluded' : ''}`}>
            <span>#{s.shot_number}</span><b>{vel(s.muzzle_velocity_fps, st8, st8.velocityUnit === 'mps' ? 1 : 0)}</b>
            <button className="btn small" onClick={() => save('shots', { ...s, is_excluded: !s.is_excluded })}>{s.is_excluded ? 'Include' : 'Exclude'}</button>
            <button className="btn small" onClick={() => remove('shots', s.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="grid2"><select value={device} onChange={(e) => setDevice(e.target.value as ChronoDevice | '')}><option value="">Auto-detect chronograph</option>{Object.entries(DEVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <label className="btn">Import chronograph CSV<input hidden type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} /></label></div>
      {msg && <p className="notice">{msg}</p>}

      <h3>Load & target</h3>
      <RecordForm<FiringString> key={f.id + f.updated_at} initial={f} submitLabel="Save string" onSubmit={(v) => save('firing_strings', { ...f, ...v })} fields={[
        { name: 'label', label: 'Label' },
        { name: 'load_recipe_id', label: cartridge ? `Load (${cartridge})` : 'Load (pick a rifle on the session to filter)', type: 'select', options: loads },
        { name: 'target_distance_yards', label: 'Distance (yd)', type: 'number' },
        { name: 'group_size_inches', label: 'Group size, center-to-center (in)', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]} />
      <p className="muted">Group: {group(f.group_size_inches, f.target_distance_yards, st8)}{f.target_analysis && ` · measured from photo · height ${fmt(f.vertical_spread_inches, 2)}" × width ${fmt(f.horizontal_spread_inches, 2)}"`}</p>
      <Link className="btn primary" to={`/strings/${f.id}/target`}>{f.target_analysis ? `Edit target measurement (${f.target_analysis.holes.length} holes)` : "Measure group from target photo"}</Link>

      <h3>Conditions</h3>
      {env.map((w) => <div key={w.id} className="card muted">{new Date(w.captured_at).toLocaleTimeString()} · {w.temperature_f ?? '—'}°F · {w.relative_humidity_percent ?? '—'}% RH · {w.station_pressure_inhg ?? '—'} inHg · DA {w.density_altitude_ft ?? '—'} · wind {w.wind_speed_mph ?? '—'} mph @ {w.wind_direction_degrees ?? '—'}° <button className="btn small" onClick={() => remove('environmental_snapshots', w.id)}>✕</button></div>)}
      <RecordForm<EnvSnapshot> key={`env-${env.length}`} submitLabel="Record conditions" onSubmit={(v) => save('environmental_snapshots', { ...v, firing_string_id: f.id, captured_at: new Date().toISOString(), source: 'manual' }).then(() => undefined)} fields={[
        { name: 'temperature_f', label: 'Temp (°F)', type: 'number' },
        { name: 'relative_humidity_percent', label: 'Humidity (%)', type: 'number' },
        { name: 'station_pressure_inhg', label: 'Station pressure (inHg)', type: 'number' },
        { name: 'density_altitude_ft', label: 'Density altitude (ft)', type: 'number' },
        { name: 'wind_speed_mph', label: 'Wind (mph)', type: 'number' },
        { name: 'wind_direction_degrees', label: 'Wind direction (°)', type: 'number' },
      ]} />
    </div>
  );
}
