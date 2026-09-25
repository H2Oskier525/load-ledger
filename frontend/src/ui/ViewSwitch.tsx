import { useState } from 'react';
import { useSettings, useDetail, type Level } from '../lib/settings';
import { FieldManager } from './FieldManager';
const KEY = { build: 'detailBuild', shoot: 'detailShoot', analyze: 'detailAnalyze' } as const;
/** Per-screen detail switch. In Full view, a Fields button lets you switch any field on or off. */
export function ViewSwitch({ screen }: { screen: 'build' | 'shoot' | 'analyze' }) {
  const { set } = useSettings();
  const { level } = useDetail(screen);
  const [open, setOpen] = useState(false);
  const opts: [Level, string][] = [['essential', 'Essential'], ['expanded', 'Expanded'], ['full', 'Full']];
  return (
    <>
      <div className="row view-row">
        <div className="seg small view">{opts.map(([v, l]) => <button type="button" key={v} className={level === v ? 'on' : ''} onClick={() => set({ [KEY[screen]]: v })}>{l}</button>)}</div>
        {level === 'full' && <button type="button" className={`btn small ${open ? 'primary' : ''}`} onClick={() => setOpen(!open)}>Fields</button>}
      </div>
      {level === 'full' && open && <FieldManager screens={[screen]} />}
    </>
  );
}
