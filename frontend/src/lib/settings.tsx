import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../data/db';
import { supabase } from './supabase';

export interface Settings {
  theme: 'dark' | 'light' | 'system' | 'sun';
  textSize: 'normal' | 'large';
  density: 'comfortable' | 'compact';
  velocityUnit: 'fps' | 'mps';
  groupUnit: 'moa' | 'mil' | 'in';
  defaultDistanceYards: number;
  defaultShotsPerString: number;
  keepScreenAwake: boolean;
  confirmDeletes: boolean;
}
export const DEFAULTS: Settings = { theme: 'dark', textSize: 'normal', density: 'comfortable', velocityUnit: 'fps', groupUnit: 'moa', defaultDistanceYards: 100, defaultShotsPerString: 5, keepScreenAwake: true, confirmDeletes: true };

const Ctx = createContext<{ s: Settings; set: (p: Partial<Settings>) => void }>({ s: DEFAULTS, set: () => {} });
export const useSettings = () => useContext(Ctx);

function apply(s: Settings) {
  const r = document.documentElement;
  const dark = s.theme === 'system' ? matchMedia('(prefers-color-scheme: dark)').matches : s.theme === 'dark';
  r.dataset.theme = s.theme === 'sun' ? 'sun' : dark ? 'dark' : 'light';
  r.dataset.text = s.textSize; r.dataset.density = s.density;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    (async () => {
      const local = await db.meta.get('settings');
      let merged: Settings = { ...DEFAULTS, ...(local ? JSON.parse(local.value) : {}) };
      if (navigator.onLine) {
        const { data } = await supabase.from('user_settings').select('settings').maybeSingle();
        if (data?.settings && !local) merged = { ...merged, ...data.settings };
      }
      setS(merged); apply(merged);
    })();
  }, []);
  useEffect(() => { apply(s); const m = matchMedia('(prefers-color-scheme: dark)'); const f = () => apply(s); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [s]);
  const set = (p: Partial<Settings>) => setS((prev) => {
    const next = { ...prev, ...p };
    db.meta.put({ key: 'settings', value: JSON.stringify(next) });
    supabase.auth.getUser().then(({ data }) => data.user && supabase.from('user_settings').upsert({ user_id: data.user.id, settings: next, updated_at: new Date().toISOString() }));
    return next;
  });
  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>;
}

// Screen wake lock while in range screens
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: any; let alive = true;
    const req = async () => { try { lock = await (navigator as any).wakeLock.request('screen'); } catch { /* ignored */ } };
    req();
    const vis = () => alive && document.visibilityState === 'visible' && req();
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); lock?.release?.(); };
  }, [on]);
}
