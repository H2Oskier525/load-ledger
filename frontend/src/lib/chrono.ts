// Chronograph CSV import. Auto-detects the device and finds the velocity column.
// Supported exports: LabRadar, Garmin Xero (ShotView app), MagnetoSpeed, Caldwell (G2 / Precision app), and any
// generic CSV with a shot/velocity column. Keep this file identical in frontend/src/lib and backend/src.
export type ChronoDevice = 'labradar' | 'garmin' | 'magnetospeed' | 'caldwell' | 'generic';
export interface ParsedShot { shot_number: number; muzzle_velocity_fps: number }
export interface ParsedSeries { device: ChronoDevice; series?: string; units: 'fps' | 'mps'; shots: ParsedShot[] }
export const DEVICE_LABELS: Record<ChronoDevice, string> = { labradar: 'LabRadar', garmin: 'Garmin Xero', magnetospeed: 'MagnetoSpeed', caldwell: 'Caldwell', generic: 'Other chronograph' };

const split = (l: string) => {
  const delim = (l.match(/;/g) || []).length > (l.match(/,/g) || []).length ? ';' : l.includes('\t') ? '\t' : ',';
  const out: string[] = []; let cur = ''; let q = false;
  for (const ch of l) { if (ch === '"') q = !q; else if (ch === delim && !q) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur);
  return out.map((c) => c.trim());
};

export function detectDevice(text: string): ChronoDevice {
  const t = text.slice(0, 2000).toLowerCase();
  if (t.includes('labradar') || /series no/.test(t) || /units velocity/.test(t)) return 'labradar';
  if (t.includes('garmin') || t.includes('xero') || t.includes('power factor') || t.includes('clean bore') || t.includes('cold bore')) return 'garmin';
  if (t.includes('magnetospeed') || /^\s*series,\d/m.test(t)) return 'magnetospeed';
  if (t.includes('caldwell') || t.includes('ballistic precision')) return 'caldwell';
  return 'generic';
}

const VEL = /^(v0|v|vel|velocity|speed|mv|muzzle velocity)\b|velocity|speed/i;
const SHOT = /^(#|no\.?|shot( ?(id|#|no|number))?|shot|number)$/i;

export function parseChronoCsv(text: string, forced?: ChronoDevice): ParsedSeries {
  const device = forced || detectDevice(text);
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map(split);
  let series: string | undefined;
  let units: 'fps' | 'mps' = /m\/s|mps|\(m\/s\)/i.test(text.slice(0, 3000)) && !/fps|ft\/s/i.test(text.slice(0, 3000)) ? 'mps' : 'fps';
  for (const row of lines) {
    const k = (row[0] || '').toLowerCase();
    if (k.startsWith('series')) series = row[1] || series;
    if (k.startsWith('units velocity')) units = /m\/s|mps/i.test(row[1] || '') ? 'mps' : 'fps';
  }
  const headerIdx = lines.findIndex((r, i) => r.length > 1 && !/^units/i.test(r[0]) && r.some((c) => VEL.test(c)) && lines.slice(i + 1, i + 4).some((n) => n.some((c) => /^\d/.test(c))));
  let shotCol = 0, velCol = 1, start = 0;
  if (headerIdx >= 0) {
    const h = lines[headerIdx];
    velCol = h.findIndex((c) => /^(v0|speed|velocity|mv)\b/i.test(c) || /speed \((fps|ft\/s|m\/s|mps)\)|velocity \(/i.test(c));
    if (velCol < 0) velCol = h.findIndex((c) => VEL.test(c) && !/avg|average|Δ|delta|dev/i.test(c));
    shotCol = h.findIndex((c) => SHOT.test(c));
    const hv = h[velCol] || '';
    if (/m\/s|mps/i.test(hv)) units = 'mps'; else if (/fps|ft\/s/i.test(hv)) units = 'fps';
    start = headerIdx + 1;
  }
  const shots: ParsedShot[] = [];
  for (const row of lines.slice(start)) {
    let v = Number((row[velCol] || '').replace(/[^\d.\-]/g, ''));
    const n = shotCol >= 0 ? Number((row[shotCol] || '').replace(/[^\d]/g, '')) : shots.length + 1;
    if (!Number.isFinite(v) || v < 100 || v > 6000) continue; // skips summary rows (avg/SD/ES are usually far smaller or labelled)
    if (/avg|average|mean|std|sd|es|spread|min|max/i.test(row[0] || '')) continue;
    if (units === 'mps') v = Math.round(v * 3.28084 * 10) / 10;
    shots.push({ shot_number: Number.isFinite(n) && n > 0 ? n : shots.length + 1, muzzle_velocity_fps: v });
  }
  if (!shots.length) throw new Error('No shot velocities were found. Make sure you exported a single session as CSV.');
  return { device, series, units, shots };
}
