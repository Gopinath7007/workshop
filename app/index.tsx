import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/auth';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center' }}>
        <ActivityIndicator color="#38BDF8" />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)' : '/(auth)/login'} />;
}
