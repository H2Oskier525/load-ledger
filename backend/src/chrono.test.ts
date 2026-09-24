import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChronoCsv } from './chrono.js';

test('LabRadar', () => {
  const r = parseChronoCsv(`Device ID;LBR-0012345;\nSeries No;0007;\nUnits velocity;fps;\n\nShot ID;V0;Date;Time\n0001;2801.2;09-20-2026;10:01:00\n0002;2795.8;09-20-2026;10:01:40\n`);
  assert.equal(r.device, 'labradar'); assert.equal(r.series, '0007'); assert.deepEqual(r.shots.map((s) => s.muzzle_velocity_fps), [2801.2, 2795.8]);
});
test('Garmin Xero ShotView', () => {
  const r = parseChronoCsv(`6.5 CM 140 ELD\n#,SPEED (FPS),Δ AVG (FPS),KE (FT-LB),POWER FACTOR (kgr⋅ft/s),TIME,CLEAN BORE,COLD BORE,SHOT NOTES\n1,2701.3,-2.1,2268,378.2,10:01:05,,,\n2,2705.9,2.5,2276,378.8,10:01:44,,,\n-,,,,,,,,\nAVERAGE SPEED,2703.6\nSTD DEV,3.2\n`);
  assert.equal(r.device, 'garmin'); assert.equal(r.shots.length, 2); assert.equal(r.shots[1].muzzle_velocity_fps, 2705.9);
});
test('Garmin metric', () => {
  const r = parseChronoCsv(`#,SPEED (M/S),Δ AVG (M/S)\n1,823.4,0.1\n`);
  assert.equal(r.units, 'mps'); assert.equal(r.shots[0].muzzle_velocity_fps, 2701.4);
});
test('generic two-column', () => {
  const r = parseChronoCsv(`Shot,Velocity\n1,1050\n2,1062\n`);
  assert.equal(r.device, 'generic'); assert.equal(r.shots.length, 2);
});
