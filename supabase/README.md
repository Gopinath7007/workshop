# Supabase setup (required for DB writes)

Project: `https://pvpnaxjaacoiyyuicjzp.supabase.co`

## Apply schema (one step)

1. Open Supabase → **SQL Editor** → New query  
2. Open and paste the entire file:

`supabase/migrations/APPLY_ALL.sql`

3. Click **Run** (may take ~10–30s)

This applies migrations `001`–`015` (tenancy, RBAC, jobs, billing, inventory, SaaS invites).

If you already applied an older dump, run only:

`supabase/migrations/015_saas_tenancy.sql`

## App env

```env
EXPO_PUBLIC_SUPABASE_URL=https://pvpnaxjaacoiyyuicjzp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_DATA_MODE=supabase
```

Restart Expo after changing `.env`.

## Multi-tenant SaaS model

| Concept | Meaning |
|---|---|
| Organization | One paying workshop (tenant) |
| Branch | Location under that workshop |
| Invite code | Staff/customer join that tenant only |
| RLS | Postgres blocks cross-workshop reads/writes |

**First login:** Register workshop **or** Join with invite (`WK-…`)  
**Owner:** More → Workshop → generate invite codes for advisors/technicians  

Each workshop owns its own customers, vehicles, jobs, estimates, and invoices.

## Force local again

```env
EXPO_PUBLIC_DATA_MODE=local
```

## Security

Use **anon** key only in the app. Never ship `service_role`.
