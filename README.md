# Velodar 🚲📍

"Waze for cyclists" — a community-based reporting app for **police posts, speed
cameras and e-bike controls** in Poland, plus **live speed tracking** with a
visual alert when you exceed the 25 km/h assist limit.

React Native / **Expo bare workflow** (`expo-dev-client`, **not** Expo Go — it
needs the native `react-native-maps` and `expo-location` modules).
Backend: **Supabase** (Postgres + PostGIS + Realtime + anonymous Auth).

---

## Features (MVP)

| # | Feature | Where |
|---|---------|-------|
| 1 | Map with your position + nearby report markers (≈15 km) | `src/screens/MapScreen.js`, `src/components/ReportMarker.js` |
| 2 | Add a report via floating **+** (type picker, auto location) | `src/components/AddReportModal.js` |
| 3 | Live speed tracking with smoothing + over-limit alert | `src/hooks/useSpeedTracking.js`, `src/components/SpeedAlert.js` |
| 4 | Realtime report sync (Supabase Realtime) | `src/hooks/useReports.js` |
| 5 | Report expiry (30–40 min, or sooner on enough "gone" votes) | `supabase/migrations/0001_init.sql` |

Waze-style voting: each marker opens a card with **👍 Aktualne** / **👎 Już nie
ma**; one vote per user (enforced by a unique constraint).

---

## Project layout

```
App.js                         # root: SafeAreaProvider + anon session + MapScreen
index.js                       # registerRootComponent entry
app.config.js                  # dynamic Expo config (reads env, map key, permissions)
supabase/migrations/0001_init.sql
src/
  services/supabase.js         # supabase-js client + ensureSession() (anon auth)
  hooks/
    useLocation.js             # user position for map + report placement
    useSpeedTracking.js        # smoothed speed + hysteresis over-limit flag
    useReports.js              # nearby RPC pull + realtime push + writers
  screens/MapScreen.js         # the whole MVP screen
  components/
    ReportMarker.js  ReportCard.js  AddReportModal.js
    SpeedIndicator.js  SpeedAlert.js
  constants/reportTypes.js     # police / camera / ebike_control catalogue
  utils/geo.js                 # distance, km/h, region sizing, relative time
```

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste `supabase/migrations/0001_init.sql` → **Run**.
   - Enables PostGIS, creates `reports` + `report_votes`, the `nearby_reports` /
     `create_report` / `cast_vote` / `expire_reports` functions, RLS policies,
     and adds `reports` to the Realtime publication.
   - `pg_cron` is used to auto-expire reports every minute. If your plan lacks
     it the block is skipped safely — reads still filter by `expires_at`, and the
     client prunes expired markers locally every 30 s.
3. **Auth → Providers → Anonymous**: enable "Allow anonymous sign-ins".
   (Each device gets a stable user id so one-vote-per-user works without signup.)
4. **Project Settings → API**: copy the **Project URL** and **anon public key**.

## 2. Environment

```bash
cp .env.example .env
```

Fill in:

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — from step 1.4.
- `GOOGLE_MAPS_ANDROID_API_KEY` — a Google Maps SDK key (Android only; iOS uses
  Apple Maps). Enable "Maps SDK for Android" in Google Cloud and restrict the key
  to the app's package `com.velodar.app`.

> The anon key is public by design — safety comes from Row Level Security, not
> from hiding it. Never put a `service_role` key in the app.

## 3. Install & build (dev client, no App Store / TestFlight)

```bash
npm install
```

Generate native projects (safe to re-run; regenerates `ios/` + `android/`):

```bash
npx expo prebuild
```

Run on a physically connected device — **no paid Apple Developer account
needed** for local device builds:

```bash
npx expo run:android --device
```

```bash
npx expo run:ios --device
```

`run:*` builds the dev client, installs it, and starts Metro. After the first
build you can just start the bundler:

```bash
npx expo start --dev-client
```

> If versions complain, align them with `npx expo install --fix` (keeps
> `react-native-maps`, `expo-location`, etc. on the versions Expo SDK 52 expects).

### iOS local device notes
- Open `ios/Velodar.xcworkspace` once in Xcode, select your device, and set a
  free **Personal Team** under Signing & Capabilities (auto-manage signing).
- Trust the developer profile on the device: Settings → General → VPN & Device
  Management. Free-provisioned apps expire after 7 days; just re-run to refresh.

---

## How the tricky bits work

**Speed smoothing** (`useSpeedTracking.js`): prefers `coords.speed`, falls back
to distance/time between fixes; rejects poor-accuracy fixes and GPS teleports;
takes the **median** of a 5-sample window (kills single spikes) then an **EMA**
for a smooth number; clamps tiny values to 0. The over-limit alert uses
**hysteresis** — on at 28 km/h, off at 25 — so it doesn't flicker at the limit.

**Expiry / "gone" logic** (`0001_init.sql`): reports default to a ~35 min life.
A `cast_vote('up')` nudges expiry out (capped at 60 min from creation); enough
`down` votes (≥3, and more than the ups) flips `is_active=false` immediately.
`expire_reports()` (pg_cron, 1/min) flips expired rows so the change propagates
over Realtime and markers disappear on everyone's map.

**Realtime** (`useReports.js`): authoritative set comes from the PostGIS
`nearby_reports` RPC; a channel on `reports` reconciles INSERT/UPDATE/DELETE
into local state (filtering inserts by distance client-side), so a nearby report
appears within a second without a reload.

---

## Roadmap / not in MVP

- Audio alert on over-limit (spec: visual only for now).
- Report photos, richer types, clustering at low zoom.
- Background location + trip history.
- Real accounts (upgrade the anonymous user) & moderation.
```
