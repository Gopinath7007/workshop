import { StyleSheet, Text } from 'react-native';
import BannerAd from '../../src/ads/BannerAd';
import { useAuth } from '../../src/auth';
import { appConfig } from '../../src/config';
import { Screen } from '../../src/ui/Screen';
import { colors } from '../../src/ui/theme';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <Text style={styles.kicker}>{appConfig.name}</Text>
      <Text style={styles.title}>Welcome{user?.displayName ? `, ${user.displayName}` : ''}</Text>
      <Text style={styles.body}>
        Signed-in home. Replace this screen with your product. Banner ads stay mounted so the
        AdMob integration remains easy to verify.
      </Text>
      <BannerAd />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.accent,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
});
