import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type RangeSession } from '../data/db';
import { RecordForm } from '../lib/form';
import { useRifleOptions } from '../lib/lookups';
import { velocityStats, vel, velSd, velLabel, group } from '../lib/stats';
import { useSettings, useWakeLock } from '../lib/settings';

export default function Session() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useLiveQuery(() => db.range_sessions.get(id!), [id]);
  const strings = alive(useLiveQuery(() => db.firing_strings.where('range_session_id').equals(id!).toArray(), [id]));
  const shots = alive(useLiveQuery(() => db.shots.toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const rifles = useRifleOptions();
  const { s: st8 } = useSettings();
  useWakeLock(st8.keepScreenAwake);
  if (!s) return <p>Loading…</p>;
  const newString = async () => {
    const last = strings[strings.length - 1];
    const sid = await save('firing_strings', { range_session_id: s.id, label: `String ${strings.length + 1}`, target_distance_yards: last?.target_distance_yards ?? st8.defaultDistanceYards, load_recipe_id: last?.load_recipe_id });
    nav(`/strings/${sid}`);
  };
  return (
    <div className="stack">
      <RecordForm<RangeSession> key={s.id} submitLabel="Save session details" initial={s} onSubmit={(v) => save('range_sessions', { ...s, ...v })} fields={[
        { name: 'session_date', label: 'Date', type: 'date', required: true },
        { name: 'rifle_id', label: 'Rifle (loads are filtered to its cartridge)', type: 'select', options: rifles },
        { name: 'range_name', label: 'Range' }, { name: 'location', label: 'Location' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]} />
      <button className="btn primary big" onClick={newString}>Start new string</button>
      {strings.map((f) => {
        const v = shots.filter((x) => x.firing_string_id === f.id && !x.is_excluded && x.muzzle_velocity_fps).map((x) => x.muzzle_velocity_fps!);
        const st = velocityStats(v);
        const load = loads.find((l) => l.id === f.load_recipe_id);
        return (
          <Link key={f.id} to={`/strings/${f.id}`} className="card">
            <div className="row"><b>{f.label}</b><span className="muted">{load?.name || 'No load'}</span></div>
            <div className="stats"><span>n {st.n}</span><span>Avg {vel(st.avg, st8)} {velLabel(st8)}</span><span>SD {velSd(st.sd, st8)}</span><span>ES {vel(st.es, st8)}</span><span>{group(f.group_size_inches, f.target_distance_yards, st8)}</span></div>
          </Link>
        );
      })}
      <button className="btn danger" onClick={async () => { if (confirm('Delete this session?')) { await remove('range_sessions', s.id); nav('/'); } }}>Delete session</button>
    </div>
  );
}
