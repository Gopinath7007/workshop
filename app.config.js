const appJson = require('./app.json');

const PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
  'EXPO_PUBLIC_ADMOB_IOS_APP_ID',
  'EXPO_PUBLIC_ADMOB_BANNER_ID',
  'EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID',
  'EXPO_PUBLIC_ADMOB_USE_TEST',
  'EXPO_PUBLIC_AUTH_REDIRECT_URL',
];

const extra = Object.fromEntries(PUBLIC_ENV_KEYS.map((key) => [key, process.env[key]]));

module.exports = {
  expo: {
    ...appJson.expo,
    extra,
  },
};
