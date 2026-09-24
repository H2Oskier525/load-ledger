# Roadmap

## Phase 1 — Web app (now, needs connection for sign-in and sync)
- [x] Supabase schema with row-level security, private file bucket
- [x] Rifles, components + lots, load recipes (duplicate for ladder steps)
- [x] Range session → firing strings → shot-by-shot velocity entry, exclude shots
- [x] Avg / SD / ES / group MOA; manual weather snapshots
- [x] LabRadar CSV import (parsed on the phone, works offline)
- [x] Analytics: charge / jump / CBTO vs Avg, SD, ES, MOA
- [x] Local-first storage + background sync, installable PWA
- [ ] CSV export, target-photo viewer, offline photo queue
- [ ] Weighted "balanced score" comparison (user-chosen weights)

## Phase 2 — Native apps (App Store + Google Play)
Wrap the same React code with **Capacitor** (`@capacitor/ios`, `@capacitor/android`):
1. `npm i @capacitor/core @capacitor/cli && npx cap init "Load Ledger" com.loadledger.app --web-dir dist`
2. `npx cap add ios && npx cap add android`
3. Storage: keep Dexie, or swap `data/db.ts` for `@capacitor-community/sqlite` if we need larger/durable on-device storage. Screens do not change.
4. Photos: `@capacitor/camera` + `@capacitor/filesystem` — save target photos to device first, upload on sync.
5. Network: `@capacitor/network` to drive the sync loop.
6. Auth: Supabase session persisted in secure storage; offline use after first sign-in.
7. Distribution: TestFlight (iOS) and Play internal testing, then store listings.
   Requires Apple Developer Program ($99/yr), Google Play Console ($25 one-time), and a Mac/cloud Mac for iOS builds.

## Phase 3 — Hardware
- Kestrel: implement `WeatherSource` in `frontend/src/integrations/weather.ts` using a native BLE plugin once Kestrel protocol access is authorized in writing.
- LabRadar: direct Bluetooth only after an official interface is confirmed; CSV import remains the supported path.
