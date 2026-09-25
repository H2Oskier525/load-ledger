import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save } from '../data/db';

export function useStartSession() {
  const nav = useNavigate();
  const rifles = alive(useLiveQuery(() => db.rifles.toArray()));
  return async () => { const id = await save('range_sessions', { session_date: new Date().toISOString().slice(0, 10), rifle_id: rifles.length === 1 ? rifles[0].id : undefined }); nav(`/sessions/${id}`); };
}
export default function Shoot() {
  const start = useStartSession();
  const sessions = alive(useLiveQuery(() => db.range_sessions.orderBy('session_date').reverse().toArray()));
  const rifles = alive(useLiveQuery(() => db.rifles.toArray()));
  const strings = alive(useLiveQuery(() => db.firing_strings.toArray()));
  return (
    <div className="stack">
      <button className="btn primary big" onClick={start}>Start range session</button>
      <h2>Range sessions</h2>
      {!sessions.length && <p className="muted">No sessions yet.</p>}
      {sessions.map((s) => (
        <Link key={s.id} className="card row" to={`/sessions/${s.id}`}>
          <div><b>{s.range_name || 'Range session'}</b><div className="muted">{s.session_date} · {rifles.find((r) => r.id === s.rifle_id)?.name || 'no rifle'} · {strings.filter((f) => f.range_session_id === s.id).length} strings</div></div>
          {s._dirty ? <span className="pill warn">Saved on phone</span> : <span className="pill ok">Synced</span>}
        </Link>
      ))}
    </div>
  );
}
