import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { isValidEmail, useAuth } from '../../src/auth';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors } from '../../src/ui/theme';

export default function ResetPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Check email', 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      Alert.alert('Email sent', 'Check your inbox for a reset link.');
    } catch (error) {
      Alert.alert('Reset failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.body}>
        Enter the email on your account. We will send a reset link if that address exists.
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <Button label="Send reset link" onPress={() => void submit()} loading={busy} disabled={!email} />
      <Link href="/(auth)/login" style={styles.link}>
        Back to sign in
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
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  link: {
    color: colors.accent,
    fontWeight: '700',
  },
});
