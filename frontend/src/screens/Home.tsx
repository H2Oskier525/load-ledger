import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive } from '../data/db';
import { useStartSession } from './Shoot';
import { lotAlert } from './Brass';
import { componentLabel } from '../ui/ComponentPicker';

export default function Home() {
  const start = useStartSession();
  const sessions = alive(useLiveQuery(() => db.range_sessions.orderBy('updated_at').reverse().toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.orderBy('updated_at').reverse().toArray()));
  const rifles = alive(useLiveQuery(() => db.rifles.toArray()));
  const strings = alive(useLiveQuery(() => db.firing_strings.toArray()));
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const lots = alive(useLiveQuery(() => db.component_lots.toArray()));
  const alerts = lots.map((l) => { const c = comps.find((x) => x.id === l.component_id); const a = lotAlert(l, c?.type); return a && { l, c, a }; }).filter(Boolean) as { l: any; c: any; a: string }[];
  const untested = loads.filter((l) => !strings.some((f) => f.load_recipe_id === l.id));
  const last = sessions[0];
  return (
    <div className="stack">
      <button className="btn primary big" onClick={start}>Start range session</button>
      {!rifles.length && <Link className="card" to="/rifles"><b>Add your first rifle</b><div className="muted">Loads are matched to rifles by cartridge.</div></Link>}
      {last && <Link className="card" to={`/sessions/${last.id}`}><span className="muted small">Review last session</span><div><b>{last.range_name || 'Range session'}</b> · {last.session_date} · {strings.filter((f) => f.range_session_id === last.id).length} strings</div></Link>}
      {untested.length > 0 && <Link className="card" to="/loads"><span className="muted small">Ready to test</span><div><b>{untested.length} load{untested.length > 1 ? 's' : ''}</b> not shot yet{untested[0] ? ` · e.g. ${untested[0].name}` : ''}</div></Link>}
      {alerts.map(({ l, c, a }) => <Link key={l.id} className="card row" to="/brass"><span>{componentLabel(c)} · {l.lot_number}</span><span className="pill warn">{a}</span></Link>)}
      <div className="grid2">
        <Link className="tile" to="/loads">Build a load</Link>
        <Link className="tile" to="/brass">Brass & stock</Link>
        <Link className="tile" to="/analytics">Compare loads</Link>
        <Link className="tile" to="/library">Library</Link>
      </div>
    </div>
  );
}
