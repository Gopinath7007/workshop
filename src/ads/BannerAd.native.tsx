import { useEffect, useState, type ComponentType } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { bannerAdUnitId } from '../config';
import { whenMobileAdsReady } from './initAds';

export default function BannerAd() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void whenMobileAdsReady().then(setReady);
  }, []);

  if (Platform.OS === 'web' || !ready) {
    return <View style={styles.slot} />;
  }

  try {
    const ads = require('react-native-google-mobile-ads') as {
      BannerAd: ComponentType<{
        unitId: string;
        size: string;
        onAdFailedToLoad?: (error: unknown) => void;
      }>;
      BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
    };
    return (
      <View style={styles.slot}>
        <ads.BannerAd
          unitId={bannerAdUnitId()}
          size={ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={(error) => console.warn('[Ads] banner failed', error)}
        />
      </View>
    );
  } catch {
    return <View style={styles.slot} />;
  }
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    minHeight: 50,
  },
});
