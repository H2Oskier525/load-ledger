import { FIELDS, type Screen } from '../lib/fields';
import { useSettings } from '../lib/settings';
const NAMES: Record<Screen, string> = { build: 'Build (loads)', shoot: 'Shoot (range)', analyze: 'Analyze' };
const LV = { essential: 'E', expanded: 'X', full: 'F' } as const;
/** Checkbox list to switch any field or section on/off. Hidden fields keep their saved data. */
export function FieldManager({ screens = ['build', 'shoot', 'analyze'] }: { screens?: Screen[] }) {
  const { s, set } = useSettings();
  const hidden = new Set(s.hiddenFields || []);
  const toggle = (id: string) => { const h = new Set(hidden); h.has(id) ? h.delete(id) : h.add(id); set({ hiddenFields: [...h] }); };
  return (
    <div className="stack">
      {screens.map((sc) => (
        <details key={sc} className="card" open={screens.length === 1}>
          <summary><b>{NAMES[sc]}</b> <span className="muted small">{FIELDS[sc].filter(([k]) => !hidden.has(`${sc}:${k}`)).length}/{FIELDS[sc].length} on</span></summary>
          <div className="fieldlist">
            {FIELDS[sc].map(([k, label, min]) => { const id = `${sc}:${k}`; return (
              <label key={id} className="check"><input type="checkbox" checked={!hidden.has(id)} onChange={() => toggle(id)} /> {label} <span className="muted small">({LV[min]})</span></label>); })}
          </div>
          <div className="row"><button type="button" className="btn small" onClick={() => set({ hiddenFields: [...hidden].filter((x) => !x.startsWith(sc + ':')) })}>All on</button>
            <button type="button" className="btn small" onClick={() => set({ hiddenFields: [...new Set([...hidden, ...FIELDS[sc].map(([k]) => `${sc}:${k}`)])] })}>All off</button></div>
        </details>))}
      <p className="muted small">E/X/F = the view where the field first appears (Essential, Expanded, Full). Turning a field off only hides it; data already saved is kept.</p>
    </div>
  );
}
