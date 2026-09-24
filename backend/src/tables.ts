// Tables that participate in sync, in parent-before-child order (FK-safe upserts).
export const SYNC_TABLES = [
  'rifles',
  'components',
  'component_lots',
  'load_recipes',
  'range_sessions',
  'firing_strings',
  'shots',
  'environmental_snapshots',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
export const isSyncTable = (t: string): t is SyncTable => (SYNC_TABLES as readonly string[]).includes(t);
