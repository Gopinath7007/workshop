import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { isStrongPassword, isValidEmail, passwordRules, useAuth } from '../../src/auth';
import { isSupabaseConfigured } from '../../src/config';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors } from '../../src/ui/theme';

export default function SignupScreen() {
  const { signUp, signInWithGoogle, googleReady } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const rules = passwordRules(password);

  const submit = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Check email', 'Enter a valid email address.');
      return;
    }
    if (!isStrongPassword(password)) {
      Alert.alert('Weak password', 'Please meet every password rule.');
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, name);
      Alert.alert(
        'Check your email',
        'If email confirmation is enabled, verify your inbox, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert(
        'Google sign-in failed',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>
        After sign-in you can register your workshop or join one with an invite — each shop’s data
        stays separate.
      </Text>
      <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <View style={styles.rules}>
        {rules.map((rule) => (
          <Text key={rule.id} style={[styles.rule, rule.ok && styles.ruleOk]}>
            {rule.ok ? '✓' : '•'} {rule.label}
          </Text>
        ))}
      </View>
      <Button label="Create account" onPress={() => void submit()} loading={busy} />
      {isSupabaseConfigured() ? (
        <Button
          label="Continue with Google"
          variant="ghost"
          onPress={() => void google()}
          loading={busy}
          disabled={!googleReady}
        />
      ) : null}
      <Link href="/(auth)/login" style={styles.link}>
        Already have an account?
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
  },
  rules: {
    gap: 4,
  },
  rule: {
    color: colors.muted,
    fontWeight: '600',
  },
  ruleOk: {
    color: colors.success,
  },
  link: {
    color: colors.accent,
    fontWeight: '700',
  },
});
