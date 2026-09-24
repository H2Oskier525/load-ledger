// Pure analytics on user-entered data. No load recommendations — recordkeeping only.
import type { Settings } from './settings';
export function velocityStats(v: number[]) {
  const n = v.length;
  if (!n) return { n: 0, avg: undefined, sd: undefined, es: undefined, min: undefined, max: undefined };
  const avg = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - avg) ** 2, 0) / (n - 1)) : undefined;
  const min = Math.min(...v), max = Math.max(...v);
  return { n, avg, sd, es: max - min, min, max };
}
export const moa = (inches?: number, yards?: number) => (inches && yards ? (inches * 100) / (yards * 1.047) : undefined);
export const mil = (inches?: number, yards?: number) => (inches && yards ? inches / (yards * 36) * 1000 : undefined);
export const fmt = (x?: number, d = 1) => (x === undefined || x === null || Number.isNaN(x) ? '—' : x.toFixed(d));

export const velLabel = (s: Settings) => (s.velocityUnit === 'mps' ? 'm/s' : 'fps');
export const vel = (fps: number | undefined, s: Settings, d = 0) => fmt(fps === undefined ? undefined : s.velocityUnit === 'mps' ? fps * 0.3048 : fps, d);
export const velSd = (fps: number | undefined, s: Settings) => vel(fps, s, 1);
export function group(inches: number | undefined, yards: number | undefined, s: Settings) {
  if (s.groupUnit === 'in') return inches === undefined ? '—' : `${fmt(inches, 3)}"`;
  if (s.groupUnit === 'mil') return `${fmt(mil(inches, yards), 2)} mil`;
  return `${fmt(moa(inches, yards), 2)} MOA`;
}
export const groupLabel = (s: Settings) => (s.groupUnit === 'in' ? 'Group (in)' : s.groupUnit === 'mil' ? 'Group (mil)' : 'Group (MOA)');
