# Workshop Management System

Expo 54 / React Native app for automobile workshops (Android, iOS, Web).

**Market:** India-first (GST, INR, UPI) — no Aadhaar  
**Backend:** Supabase  
**State:** Zustand + TanStack Query  

## Quick start

```bash
cp .env.example .env
# set EXPO_PUBLIC_SUPABASE_ANON_KEY from Supabase project settings
npm install
npx expo start
```

Dev Supabase project URL is prefilled:

`https://pvpnaxjaacoiyyuicjzp.supabase.co`

Switch accounts later by updating only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Apply database migrations

In the Supabase SQL editor, run in order:

1. `supabase/migrations/001_profiles.sql`
2. `002_tenancy.sql` … through `012_seed_rbac_workflow.sql`

See `supabase/README.md`.

## Architecture (Phase 1)

```
app/                         Expo Router screens
src/
  auth/                      Supabase auth
  config/                    app + architecture config
  modules/rbac|job-cards/    domain rules (permissions, workflow)
  providers/ocr|vehicle-info Provider abstractions
  repositories/              Repository interfaces (Supabase impl next)
  store/                     Zustand session
  types/                     Domain types
  utils/                     GST helpers
supabase/migrations/         Postgres schema + RLS + seed
```

## Locked decisions

| Topic | Choice |
|---|---|
| Backend | Supabase only (v1) |
| First vertical slice | Job Card end-to-end |
| State | Zustand + TanStack Query |
| Ads | Removed |

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest |

## Database (Supabase)

1. Paste & run `supabase/migrations/APPLY_ALL.sql` in the SQL Editor  
2. Ensure `.env` has anon key + `EXPO_PUBLIC_DATA_MODE=supabase`  
3. Sign in → create a job card → verify rows in Table Editor  

More → shows **Data: Supabase Postgres** when connected.

Local AsyncStorage data (default `EXPO_PUBLIC_DATA_MODE=local`):

1. **Jobs → Create job card** — customer + vehicle upsert
2. **Job detail** — workflow, GST estimate, approve, invoice, UPI/cash payment
3. **Dashboard / Customers / Vehicles / Billing** — live lists and counts

Set `EXPO_PUBLIC_DATA_MODE=supabase` after migrations + org membership.

## Inventory + plate scan (Phase 4)

- **More → Inventory** — demo parts, reorder alerts, stock in/out, add part
- **Vehicles → Add / Scan** — camera or gallery → `OcrProvider` → `VehicleInfoProvider`
- Demo plates with registry data: `MH12AB1234`, `KA01MJ9087`, `TN09BC4455`
- Swap providers later (ML Kit OCR, Vahan API) without changing screens

## Navigation (Phase 2)

- `app/(staff)` — RBAC-filtered tabs (Dashboard, Jobs, Customers, Vehicles, More) + module shells
- `app/(customer)` — portal tabs (Home, Vehicles, Jobs, Approvals, Invoices, Profile)
- Dev role switcher on staff **More** (and customer Profile) until `user_roles` is wired
