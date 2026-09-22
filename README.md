# Expo Supabase Auth Scaffold

Reusable Expo 54 / React Native 0.81 template named **`expo-supabase-auth-scaffold`**.

It keeps the production-grade pieces most apps need and nothing else:

- Supabase email authentication
- Registration and password reset
- Session persistence (AsyncStorage)
- Protected Expo Router navigation
- Optional Google sign-in
- Google Mobile Ads (test units by default)

This branch is ready to extract into a standalone template repository with the same name.

## Quick start

```bash
cp .env.example .env
# fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start
```

Apply `supabase/migrations/001_profiles.sql` in the Supabase SQL editor.

## Environment

Copy `.env.example` to `.env`. All `EXPO_PUBLIC_*` values are mapped into Expo `extra` by `app.config.js` and read from `src/config/app.config.ts`.

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | For Google | OAuth web client |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Optional | Android client |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Optional | iOS client |
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | Optional | Email confirm / reset redirect |
| `EXPO_PUBLIC_ADMOB_*` | Optional | Production AdMob IDs |

`EXPO_PUBLIC_ADMOB_USE_TEST` defaults to test units. Set it to `false` only with production unit IDs.

## Architecture

```
src/config/app.config.ts   # single config source
src/config/env.ts          # process.env + Expo extra
src/lib/supabase.ts        # client, persist, timeouts
src/auth/                  # provider, services, password, email
src/ads/                   # AdMob init + banner
src/ui/                    # presentational kit
app/(auth)                 # login / signup / reset
app/(app)                  # protected Home + Profile
supabase/migrations        # profiles + RLS
```

Add product screens under `app/(app)`. Import config from `src/config`. Keep secrets out of source.

## Auth flow

1. Cold start restores the Supabase session from AsyncStorage.
2. `app/index.tsx` sends signed-in users to `/(app)` and everyone else to `/(auth)/login`.
3. `(app)/_layout.tsx` redirects away if the session is missing.
4. `(auth)/_layout.tsx` redirects away if a session already exists.
5. Sign-up, reset, and resend verification use the email redirect in config when set.

## Ads

`initMobileAds()` runs from the root layout. Home mounts `BannerAd` so the AdMob plugin path stays easy to verify. Web and failed native init render an empty slot.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest |
| `npm run prebuild` | Generate native projects |

## Extract a standalone template

1. Create an empty GitHub repository named `expo-supabase-auth-scaffold`.
2. Copy this branch (or squash it) into that repository.
3. Replace `com.example.authscaffold`, icons, and AdMob app IDs.
4. Point EAS at the new project if you need cloud builds.
5. Do not copy `.env`, `google-services.json`, or store keystores.

See `SCAFFOLD_MIGRATION_REPORT.md` for the full strip list and breaking changes.
