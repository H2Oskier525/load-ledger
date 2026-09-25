import { useSettings, useDetail, type Level } from '../lib/settings';
const KEY = { build: 'detailBuild', shoot: 'detailShoot', analyze: 'detailAnalyze' } as const;
/** Per-screen detail switch. Changes only this screen; the global default lives in Settings. */
export function ViewSwitch({ screen }: { screen: 'build' | 'shoot' | 'analyze' }) {
  const { set } = useSettings();
  const { level } = useDetail(screen);
  const opts: [Level, string][] = [['essential', 'Essential'], ['expanded', 'Expanded'], ['full', 'Full']];
  return <div className="seg small view">{opts.map(([v, l]) => <button type="button" key={v} className={level === v ? 'on' : ''} onClick={() => set({ [KEY[screen]]: v })}>{l}</button>)}</div>;
}
