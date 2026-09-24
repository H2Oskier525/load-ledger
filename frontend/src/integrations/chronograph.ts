import type { ParsedShot } from '../lib/chrono';
// Provider boundary for live Bluetooth chronographs. CSV import (lib/chrono.ts) works for every device today.
// Live providers get added here once each manufacturer's protocol is available/authorized, using a native
// Capacitor BLE plugin so it works on both iPhone and Android.
//   LabRadar LX / V1  — pending official interface
//   Garmin Xero C1    — no public BLE API; data flows via Garmin ShotView CSV export for now
//   MagnetoSpeed      — CSV from display unit / app
//   Caldwell G2       — CSV via Caldwell app
export interface ChronographSource {
  id: 'labradar' | 'garmin' | 'magnetospeed' | 'caldwell';
  label: string;
  available(): Promise<boolean>;
  connect(onShot: (s: ParsedShot) => void): Promise<() => void>; // returns disconnect
}
export const chronographSources: ChronographSource[] = [];
