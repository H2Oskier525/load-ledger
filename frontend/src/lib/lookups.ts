import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive } from '../data/db';
import { sameCartridge } from '../catalog/catalog';
export function useRifleOptions() {
  return alive(useLiveQuery(() => db.rifles.toArray())).map((r) => ({ value: r.id, label: `${r.name}${r.cartridge ? ` · ${r.cartridge}` : ''}` }));
}
/** Loads that match the rifle's cartridge (all loads if no rifle chosen). */
export function useLoadOptions(rifleId?: string) {
  const rifle = useLiveQuery(async () => (rifleId ? await db.rifles.get(rifleId) : undefined), [rifleId]);
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const cart = rifle?.cartridge || rifle?.caliber;
  const list = cart ? loads.filter((l) => sameCartridge(l.cartridge, cart)) : loads;
  return { cartridge: cart, options: list.map((l) => ({ value: l.id, label: `${l.name}${l.powder_charge_grains ? ` · ${l.powder_charge_grains} gr` : ''}` })) };
}
