import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive } from '../data/db';
export function useLotOptions() {
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const lots = alive(useLiveQuery(() => db.component_lots.toArray()));
  const opts = (type: string) => lots.flatMap((l) => { const c = comps.find((x) => x.id === l.component_id); return c && c.type === type ? [{ value: l.id, label: `${c.manufacturer || ''} ${c.product_name} · lot ${l.lot_number}`.trim() }] : []; });
  return { bullet: opts('bullet'), powder: opts('powder'), primer: opts('primer'), case: opts('case') };
}
export function useRifleOptions() {
  return alive(useLiveQuery(() => db.rifles.toArray())).map((r) => ({ value: r.id, label: r.name }));
}
export function useLoadOptions() {
  return alive(useLiveQuery(() => db.load_recipes.toArray())).map((l) => ({ value: l.id, label: `${l.name}${l.powder_charge_grains ? ` · ${l.powder_charge_grains} gr` : ''}` }));
}
