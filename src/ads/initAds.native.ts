type MobileAdsModule = {
  (): { initialize: () => Promise<unknown> };
};

let initPromise: Promise<boolean> | null = null;

export function initMobileAds(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const mobileAds = require('react-native-google-mobile-ads')
        .default as MobileAdsModule;
      await mobileAds().initialize();
      return true;
    } catch (error) {
      console.warn('[Ads] SDK init skipped', error);
      return false;
    }
  })();
  return initPromise;
}

export function whenMobileAdsReady(): Promise<boolean> {
  return initPromise ?? initMobileAds();
}
