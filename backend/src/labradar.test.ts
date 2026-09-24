import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabradarCsv } from './labradar.js';

test('parses a LabRadar-style export', () => {
  const csv = `Device ID;LBR-0012345;\nSeries No;0007;\nUnits velocity;fps;\n\nShot ID;V0;Date;Time\n0001;2801.2;09-20-2026;10:01:00\n0002;2795.8;09-20-2026;10:01:40\n0003;2804.0;09-20-2026;10:02:20\n`;
  const r = parseLabradarCsv(csv);
  assert.equal(r.series, '0007');
  assert.equal(r.shots.length, 3);
  assert.equal(r.shots[1].muzzle_velocity_fps, 2795.8);
});
