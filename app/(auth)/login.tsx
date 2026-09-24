import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { isValidEmail, useAuth } from '../../src/auth';
import { isSupabaseConfigured } from '../../src/config';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors } from '../../src/ui/theme';

export default function LoginScreen() {
  const { signIn, signInWithGoogle, googleReady, resendVerificationEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Check email', 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/verify your email/i.test(message)) {
        Alert.alert('Email not verified', message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resend email',
            onPress: () => {
              void resendVerificationEmail(email).then(
                () => Alert.alert('Sent', 'Check your inbox for a verification link.'),
                (resendError) =>
                  Alert.alert(
                    'Resend failed',
                    resendError instanceof Error ? resendError.message : String(resendError),
                  ),
              );
            },
          },
        ]);
      } else {
        Alert.alert('Sign in failed', message);
      }
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
      <Text style={styles.kicker}>Workshop</Text>
      <Text style={styles.title}>Sign in</Text>
      {!isSupabaseConfigured() ? (
        <Text style={styles.warn}>Add Supabase keys to .env to enable sign-in.</Text>
      ) : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
      />
      <Button label="Sign in" onPress={() => void submit()} loading={busy} disabled={!email || !password} />
      {isSupabaseConfigured() ? (
        <Button
          label="Continue with Google"
          variant="ghost"
          onPress={() => void google()}
          loading={busy}
          disabled={!googleReady}
        />
      ) : null}
      <Link href="/(auth)/reset-password" style={styles.link}>
        Forgot password?
      </Link>
      <Link href="/(auth)/signup" style={styles.link}>
        Create an account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  warn: {
    color: colors.danger,
  },
  link: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
});
