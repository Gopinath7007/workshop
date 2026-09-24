const appJson = require('./app.json');

const PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_AUTH_REDIRECT_URL',
  'EXPO_PUBLIC_DATA_MODE',
];

const extra = Object.fromEntries(PUBLIC_ENV_KEYS.map((key) => [key, process.env[key]]));

module.exports = {
  expo: {
    ...appJson.expo,
    extra,
  },
};
