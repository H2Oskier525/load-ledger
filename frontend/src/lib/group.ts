// Group measurement from user-marked hole centers (pixel coordinates on the photo).
export type Pt = { x: number; y: number };
export interface TargetAnalysis { scale?: { a: Pt; b: Pt; inches: number }; holes: Pt[]; bullet_diameter_inches?: number; image_w?: number; image_h?: number }

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const pxPerInch = (t: TargetAnalysis) => (t.scale && t.scale.inches > 0 ? dist(t.scale.a, t.scale.b) / t.scale.inches : undefined);

export function measureGroup(t: TargetAnalysis) {
  const ppi = pxPerInch(t);
  const h = t.holes;
  if (!ppi || h.length < 2) return { n: h.length } as { n: number; ctc?: number; edge?: number; vertical?: number; horizontal?: number; meanRadius?: number; pair?: [number, number] };
  let max = 0, pair: [number, number] = [0, 1];
  for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) { const d = dist(h[i], h[j]); if (d > max) { max = d; pair = [i, j]; } }
  const xs = h.map((p) => p.x), ys = h.map((p) => p.y);
  const cx = xs.reduce((a, b) => a + b, 0) / h.length, cy = ys.reduce((a, b) => a + b, 0) / h.length;
  const ctc = max / ppi;
  return {
    n: h.length,
    ctc, // center-to-center extreme spread (inches)
    edge: t.bullet_diameter_inches ? ctc + t.bullet_diameter_inches : undefined, // outside edge-to-edge
    vertical: (Math.max(...ys) - Math.min(...ys)) / ppi,
    horizontal: (Math.max(...xs) - Math.min(...xs)) / ppi,
    meanRadius: h.reduce((a, p) => a + Math.hypot(p.x - cx, p.y - cy), 0) / h.length / ppi,
    pair,
  };
}
