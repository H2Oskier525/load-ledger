// Pure analytics on user-entered data. No load recommendations — recordkeeping only.
export function velocityStats(v: number[]) {
  const n = v.length;
  if (!n) return { n: 0, avg: undefined, sd: undefined, es: undefined, min: undefined, max: undefined };
  const avg = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - avg) ** 2, 0) / (n - 1)) : undefined;
  const min = Math.min(...v), max = Math.max(...v);
  return { n, avg, sd, es: max - min, min, max };
}
export const moa = (inches?: number, yards?: number) => (inches && yards ? (inches * 100) / (yards * 1.047) : undefined);
export const fmt = (x?: number, d = 1) => (x === undefined || Number.isNaN(x) ? '—' : x.toFixed(d));
