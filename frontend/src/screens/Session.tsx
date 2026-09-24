import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type RangeSession } from '../data/db';
import { RecordForm } from '../lib/form';
import { useRifleOptions } from '../lib/lookups';
import { velocityStats, fmt, moa } from '../lib/stats';

export default function Session() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useLiveQuery(() => db.range_sessions.get(id!), [id]);
  const strings = alive(useLiveQuery(() => db.firing_strings.where('range_session_id').equals(id!).toArray(), [id]));
  const shots = alive(useLiveQuery(() => db.shots.toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const rifles = useRifleOptions();
  if (!s) return <p>Loading…</p>;
  const newString = async () => {
    const last = strings[strings.length - 1];
    const sid = await save('firing_strings', { range_session_id: s.id, label: `String ${strings.length + 1}`, target_distance_yards: last?.target_distance_yards ?? 100, load_recipe_id: last?.load_recipe_id });
    nav(`/strings/${sid}`);
  };
  return (
    <div className="stack">
      <RecordForm<RangeSession> key={s.id} submitLabel="Save session details" initial={s} onSubmit={(v) => save('range_sessions', { ...s, ...v })} fields={[
        { name: 'session_date', label: 'Date', type: 'date', required: true },
        { name: 'rifle_id', label: 'Rifle', type: 'select', options: rifles },
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
            <div className="stats"><span>n {st.n}</span><span>Avg {fmt(st.avg, 0)}</span><span>SD {fmt(st.sd)}</span><span>ES {fmt(st.es, 0)}</span><span>MOA {fmt(moa(f.group_size_inches, f.target_distance_yards), 2)}</span></div>
          </Link>
        );
      })}
      <button className="btn danger" onClick={async () => { if (confirm('Delete this session?')) { await remove('range_sessions', s.id); nav('/'); } }}>Delete session</button>
    </div>
  );
}
