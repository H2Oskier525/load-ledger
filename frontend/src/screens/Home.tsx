import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save } from '../data/db';

export default function Home() {
  const nav = useNavigate();
  const sessions = alive(useLiveQuery(() => db.range_sessions.orderBy('updated_at').reverse().toArray()));
  const rifles = alive(useLiveQuery(() => db.rifles.toArray()));
  const start = async () => {
    const id = await save('range_sessions', { session_date: new Date().toISOString().slice(0, 10), rifle_id: rifles.length === 1 ? rifles[0].id : undefined });
    nav(`/sessions/${id}`);
  };
  return (
    <div className="stack">
      <button className="btn primary big" onClick={start}>Start range session</button>
      <div className="grid2">
        <Link className="tile" to="/rifles">Rifles<small>{rifles.length}</small></Link>
        <Link className="tile" to="/components">Components</Link>
        <Link className="tile" to="/loads">Load recipes</Link>
        <Link className="tile" to="/analytics">Analytics</Link>
      </div>
      <h2>Recent sessions</h2>
      {!sessions.length && <p className="muted">No sessions yet.</p>}
      {sessions.slice(0, 8).map((s) => (
        <Link key={s.id} className="card row" to={`/sessions/${s.id}`}>
          <div><b>{s.range_name || 'Range session'}</b><div className="muted">{s.session_date}{s.location ? ` · ${s.location}` : ''}</div></div>
          {s._dirty ? <span className="pill warn">Saved on phone</span> : <span className="pill ok">Synced</span>}
        </Link>
      ))}
    </div>
  );
}
