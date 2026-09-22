# Scaffold migration report

Branch: `feature/expo-scaffold-refactor`  
Source app: Puzzle Lane / `base`  
Target template: `expo-supabase-auth-scaffold`

## Files removed

Game routes, play loop, Together/Duel, admin, i18n packs, Firebase leftovers, nearby Bluetooth, stores, services, mock data, and product docs.

Notable trees:

- `app/(play)`, `app/(tabs)`, `app/admin.tsx`
- `components/`, `contexts/`, `firebase/`, `hooks/`, `lib/`, `locales/`
- `modules/nearby-bluetooth`, `navigation/`, `scripts/`, `services/`, `store/`
- `types/`, `utils/`, previous `__tests__`
- `assets/sounds`, `assets/images/games`, `assets/store`
- Game-specific Supabase migrations `001`–`045` (replaced by `001_profiles.sql`)
- Product markdown (`ROCKET_*`, `CHALLENGE_*`, `BUILD_AND_DEPLOY.md`, `DUEL_STREAK_PLAN.md`, …)
- GitHub Pages / EAS OTA workflows and hardcoded Puzzle Lane Supabase config

Kept generic icons: `assets/images/icon.png`, `splash-icon.png`, `favicon.png`, `android-icon-foreground.png`.

## Dependencies removed

From `package.json`:

- `expo-av`
- `expo-iap`
- `expo-document-picker`
- `expo-file-system`
- `expo-font`
- `expo-haptics`
- `expo-image`
- `expo-image-manipulator`
- `expo-image-picker`
- `expo-linear-gradient`
- `expo-localization`
- `expo-notifications`
- `expo-store-review`
- `expo-symbols`
- `expo-device`
- `expo-application`
- `expo-updates`
- `expo-modules-core`
- `@react-navigation/bottom-tabs`
- `@react-navigation/elements`
- `nearby-bluetooth`
- `zustand`
- `react-native-svg`

Also dropped game-only scripts (`build:android*`, `update:production`, web export, reset-project, postinstall overlay patch).

## Dependencies retained

Runtime:

- `expo` ~54
- `react` 19.1 / `react-native` 0.81.5
- `expo-router`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`
- `expo-auth-session`, `expo-web-browser`, `@react-native-google-signin/google-signin`
- `@supabase/supabase-js`, `@react-native-async-storage/async-storage`
- `react-native-google-mobile-ads`
- `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`
- `react-native-web`, `@expo/metro-runtime`, `@expo/vector-icons`, `expo-build-properties`

Dev: TypeScript, Jest, `jest-expo`, ESLint, `expo-dev-client`.

## Architecture changes

- Config lives in `src/config/app.config.ts` with env helpers in `src/config/env.ts`
- Auth is a module (`src/auth`) instead of a game-mixed context
- Ads are isolated in `src/ads`
- Expo Router groups: `(auth)` public, `(app)` protected
- Session persist uses Supabase Auth + AsyncStorage
- Branding is generic (`Auth Scaffold`, `com.example.authscaffold`, scheme `expoauth`)
- One profiles migration with RLS and `handle_new_user`

## Breaking changes

- All game screens, scores, streaks, duels, and admin tools are gone
- Package name and slug changed; Puzzle Lane store binaries will not update this project
- Previous Supabase RPCs and tables are not created by the new migration
- Guest play, phone OTP, and 13-language i18n are removed
- Hardcoded Puzzle Lane Supabase/AdMob/EAS IDs are no longer defaults
- IAP, push notifications, Firebase, and nearby Bluetooth are removed
- `typedRoutes` is off so stale generated game routes cannot break `tsc`

## Future extension points

- Add product tabs and screens under `app/(app)`
- Turn on Google by filling client IDs
- Swap test AdMob units for production IDs
- Extend `profiles` for avatars or preferences
- Add IAP, notifications, or i18n as separate modules
- Re-enable `typedRoutes` after `npx expo start` regenerates router types
- Extract this branch into a new git remote named `expo-supabase-auth-scaffold`

## Verification

- `npx tsc --noEmit` passes
- Jest: config + auth helpers
- Expo Metro starts
- Auth routes: login, signup, reset, protected Home/Profile
- Ads: native init + Home banner slot (test units)
