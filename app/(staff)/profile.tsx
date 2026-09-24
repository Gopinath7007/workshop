import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { isStrongPassword, useAuth } from '../../src/auth';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { colors } from '../../src/ui/theme';

export default function StaffProfileScreen() {
  const { user, signOut, updateProfile, updatePassword } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile(name);
      Alert.alert('Saved', 'Your display name was updated.');
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (!isStrongPassword(password)) {
      Alert.alert('Weak password', 'Please meet the password rules first.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword('');
      Alert.alert('Updated', 'Your password was changed.');
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.meta}>{user?.email || 'No email'}</Text>
      <Text style={styles.meta}>
        {user?.emailVerified ? 'Email verified' : 'Email not verified'}
      </Text>
      <TextField label="Display name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Button label="Save name" onPress={() => void save()} loading={busy} />
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        label="Update password"
        variant="ghost"
        onPress={() => void changePassword()}
        loading={busy}
      />
      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
  },
});
