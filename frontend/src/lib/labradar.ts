// Parses a LabRadar series CSV export into shot velocities.
// LabRadar exports vary by firmware; we find the header row containing "Shot" and a velocity column.
export interface ParsedShot { shot_number: number; muzzle_velocity_fps: number }
export interface ParsedSeries { series?: string; units: 'fps' | 'mps'; shots: ParsedShot[] }

export function parseLabradarCsv(text: string): ParsedSeries {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, '')));
  let series: string | undefined;
  let units: 'fps' | 'mps' = 'fps';
  for (const row of lines) {
    const key = (row[0] || '').toLowerCase();
    if (key.startsWith('series no')) series = row[1];
    if (key.startsWith('units velocity')) units = /m\/s|mps/i.test(row[1] || '') ? 'mps' : 'fps';
  }
  const headerIdx = lines.findIndex((r) => r.some((c) => /^shot/i.test(c)) && r.some((c) => /^v(el)?\d*|^speed|velocity/i.test(c)));
  if (headerIdx < 0) throw new Error('Could not find a shot/velocity header row in this CSV.');
  const header = lines[headerIdx].map((c) => c.toLowerCase());
  const shotCol = header.findIndex((c) => c.startsWith('shot'));
  const velCol = header.findIndex((c, i) => i !== shotCol && (/^v(el)?0?$/.test(c) || c.includes('velocity') || c.startsWith('speed')));
  const vc = velCol >= 0 ? velCol : shotCol + 1;
  const shots: ParsedShot[] = [];
  for (const row of lines.slice(headerIdx + 1)) {
    const n = Number(row[shotCol]);
    let v = Number(row[vc]);
    if (!Number.isFinite(n) || !Number.isFinite(v) || v <= 0) continue;
    if (units === 'mps') v = Math.round(v * 3.28084 * 10) / 10;
    shots.push({ shot_number: n, muzzle_velocity_fps: v });
  }
  if (!shots.length) throw new Error('No shot velocities were found in this CSV.');
  return { series, units, shots };
}
