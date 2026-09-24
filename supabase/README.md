# Supabase setup (required for DB writes)

Project: `https://pvpnaxjaacoiyyuicjzp.supabase.co`

## Apply schema (one step)

1. Open Supabase → **SQL Editor** → New query  
2. Open and paste the entire file:

`supabase/migrations/APPLY_ALL.sql`

3. Click **Run** (may take ~10–30s)

This applies migrations `001`–`014` (tenancy, RBAC, jobs, billing, inventory RLS, bootstrap).

## App env

```env
EXPO_PUBLIC_SUPABASE_URL=https://pvpnaxjaacoiyyuicjzp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_DATA_MODE=supabase
```

Restart Expo after changing `.env`.

## What happens on first login

`bootstrap_workshop` creates:
- Organization
- Head Office branch  
- `owner` role for you

Then customers / vehicles / job cards / estimates / invoices / parts write to Postgres.

Check **Table Editor** after creating a job card.

## Force local again

```env
EXPO_PUBLIC_DATA_MODE=local
```

## Security

Use **anon** key only in the app. Never ship `service_role`.
