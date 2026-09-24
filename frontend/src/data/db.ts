import Dexie, { type Table } from 'dexie';

// Local-first store. Every screen reads/writes here; the sync engine moves data to/from the cloud.
// When we wrap with Capacitor for the App Store / Play Store, this same IndexedDB store lives on the phone.
// (If we outgrow it, swap this file for a SQLite adapter without touching screens.)
export interface Base { id: string; user_id?: string; created_at: string; updated_at: string; deleted_at?: string | null; _dirty?: 0 | 1 }
export interface Rifle extends Base { name: string; cartridge?: string; manufacturer?: string; model?: string; caliber?: string; barrel_length_inches?: number; twist_rate?: string; barrel_round_count?: number; notes?: string }
export interface Component extends Base { type: 'bullet' | 'powder' | 'primer' | 'case'; manufacturer?: string; product_name: string; caliber_or_size?: string; weight_grains?: number; catalog_key?: string; is_quick_add?: boolean; bullet_diameter_inches?: number; bullet_type?: string; notes?: string }
export interface ComponentLot extends Base { component_id: string; lot_number: string; purchase_date?: string; notes?: string }
export interface LoadRecipe extends Base { rifle_id?: string; name: string; cartridge?: string; bullet_id?: string; powder_id?: string; primer_id?: string; case_id?: string; bullet_lot_id?: string; powder_lot_id?: string; primer_lot_id?: string; case_lot_id?: string; powder_charge_grains?: number; cartridge_overall_length_inches?: number; base_to_ogive_inches?: number; bullet_jump_inches?: number; case_firing_count?: number; neck_tension_inches?: number; trim_length_inches?: number; notes?: string }
export interface RangeSession extends Base { rifle_id?: string; session_date: string; range_name?: string; location?: string; notes?: string }
export interface FiringString extends Base { range_session_id: string; load_recipe_id?: string; label?: string; target_distance_yards?: number; group_size_inches?: number; vertical_spread_inches?: number; horizontal_spread_inches?: number; target_photo_path?: string; target_analysis?: import('../lib/group').TargetAnalysis; notes?: string }
export interface Shot extends Base { firing_string_id: string; shot_number: number; muzzle_velocity_fps?: number; is_excluded: boolean; exclusion_reason?: string; notes?: string; source: 'manual' | `${'labradar' | 'garmin' | 'magnetospeed' | 'caldwell' | 'generic'}_${'csv' | 'ble'}` }
export interface EnvSnapshot extends Base { firing_string_id: string; captured_at: string; source: 'manual' | 'kestrel' | 'import'; temperature_f?: number; relative_humidity_percent?: number; station_pressure_inhg?: number; density_altitude_ft?: number; wind_speed_mph?: number; wind_direction_degrees?: number; notes?: string }
export interface Photo { id: string; blob: Blob; uploaded: 0 | 1 } // keyed by firing_string id, stays on the phone
export interface Meta { key: string; value: string }

export const TABLES = ['rifles', 'components', 'component_lots', 'load_recipes', 'range_sessions', 'firing_strings', 'shots', 'environmental_snapshots'] as const;
export type TableName = (typeof TABLES)[number];

class LedgerDB extends Dexie {
  rifles!: Table<Rifle, string>;
  components!: Table<Component, string>;
  component_lots!: Table<ComponentLot, string>;
  load_recipes!: Table<LoadRecipe, string>;
  range_sessions!: Table<RangeSession, string>;
  firing_strings!: Table<FiringString, string>;
  shots!: Table<Shot, string>;
  environmental_snapshots!: Table<EnvSnapshot, string>;
  meta!: Table<Meta, string>;
  photos!: Table<Photo, string>;
  constructor() {
    super('load-ledger');
    this.version(1).stores({
      rifles: 'id, _dirty, updated_at',
      components: 'id, type, _dirty, updated_at',
      component_lots: 'id, component_id, _dirty, updated_at',
      load_recipes: 'id, rifle_id, _dirty, updated_at',
      range_sessions: 'id, rifle_id, session_date, _dirty, updated_at',
      firing_strings: 'id, range_session_id, load_recipe_id, _dirty, updated_at',
      shots: 'id, firing_string_id, _dirty, updated_at',
      environmental_snapshots: 'id, firing_string_id, _dirty, updated_at',
      meta: 'key',
    });
    this.version(2).stores({ photos: 'id, uploaded' });
    this.version(3).stores({ load_recipes: 'id, rifle_id, cartridge, _dirty, updated_at', components: 'id, type, catalog_key, _dirty, updated_at' });
  }
}
export const db = new LedgerDB();

const now = () => new Date().toISOString();
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined)) as T;

/** Save locally (always succeeds offline) and mark for sync. */
export async function save(table: TableName, record: Record<string, any>): Promise<string> {
  const t = db.table(table);
  const existing = record.id ? await t.get(record.id) : undefined;
  const row = clean({ ...existing, ...record, id: record.id || crypto.randomUUID(), created_at: existing?.created_at || now(), updated_at: now(), _dirty: 1 });
  await t.put(row);
  return row.id as string;
}
/** Soft delete so the deletion also syncs. */
export async function remove(table: TableName, id: string) {
  await db.table(table).update(id, { deleted_at: now(), updated_at: now(), _dirty: 1 });
}
export const alive = <T extends Base>(rows: T[] | undefined) => (rows || []).filter((r) => !r.deleted_at);
