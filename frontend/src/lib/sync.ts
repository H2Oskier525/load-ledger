import { db, TABLES } from '../data/db';
import { supabase, API_URL } from './supabase';

export type SyncState = { status: 'idle' | 'syncing' | 'offline' | 'error'; pending: number; lastSync?: string; error?: string };
let state: SyncState = { status: 'idle', pending: 0 };
const listeners = new Set<(s: SyncState) => void>();
const emit = (patch: Partial<SyncState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l(state)); };
export const onSync = (fn: (s: SyncState) => void) => { listeners.add(fn); fn(state); return () => { listeners.delete(fn); }; };

export async function pendingCount() {
  let n = 0;
  for (const t of TABLES) n += await db.table(t).where('_dirty').equals(1).count();
  return n;
}

let running = false;
export async function syncNow() {
  if (running) return;
  const pending = await pendingCount();
  if (!navigator.onLine) return emit({ status: 'offline', pending });
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return emit({ pending });
  running = true;
  emit({ status: 'syncing', pending });
  try {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    // 1. push local changes
    const changes: Record<string, unknown[]> = {};
    for (const t of TABLES) changes[t] = await db.table(t).where('_dirty').equals(1).toArray();
    if (pending) {
      const r = await fetch(`${API_URL}/api/sync/push`, { method: 'POST', headers, body: JSON.stringify({ changes }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Push failed (${r.status})`);
      await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
        for (const t of TABLES) for (const row of changes[t] as { id: string; updated_at: string }[]) {
          const cur = await db.table(t).get(row.id);
          if (cur && cur.updated_at === row.updated_at) await db.table(t).update(row.id, { _dirty: 0 });
        }
      });
    }
    // 2. pull remote changes (from other devices)
    const since = (await db.meta.get('lastPull'))?.value || '1970-01-01T00:00:00Z';
    const r = await fetch(`${API_URL}/api/sync/pull?since=${encodeURIComponent(since)}`, { headers });
    if (!r.ok) throw new Error(`Pull failed (${r.status})`);
    const body = await r.json();
    await db.transaction('rw', [...TABLES.map((t) => db.table(t)), db.meta], async () => {
      for (const t of TABLES) for (const row of body.changes[t] || []) {
        const cur = await db.table(t).get(row.id);
        if (cur?._dirty && cur.updated_at > row.updated_at) continue; // local edit is newer
        await db.table(t).put({ ...row, _dirty: 0 });
      }
      await db.meta.put({ key: 'lastPull', value: body.serverTime });
    });
    emit({ status: 'idle', pending: await pendingCount(), lastSync: new Date().toISOString(), error: undefined });
  } catch (e) {
    emit({ status: navigator.onLine ? 'error' : 'offline', pending: await pendingCount(), error: (e as Error).message });
  } finally {
    running = false;
  }
}

export function startSyncLoop() {
  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => emit({ status: 'offline' }));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow());
  setInterval(syncNow, 30_000);
  // refresh pending counter whenever local data changes
  TABLES.forEach((t) => ['creating', 'updating'].forEach((ev) => (db.table(t).hook as any)(ev, () => { setTimeout(async () => emit({ pending: await pendingCount() }), 0); })));
  syncNow();
}
