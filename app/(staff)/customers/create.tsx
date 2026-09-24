import { Redirect, useRouter } from 'expo-router';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { Button } from '../../../src/ui/Button';
import { PlaceholderScreen } from '../../../src/ui/PlaceholderScreen';

export default function CreateCustomerScreen() {
  const { can } = usePermissions();
  const router = useRouter();

  if (!can('customers.create')) {
    return <Redirect href="/(staff)/(tabs)/customers" />;
  }

  return (
    <PlaceholderScreen
      title="New Customer"
      description="Name, mobile, GSTIN, address, and notes. India GSTIN validation comes with the CRM form."
    >
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </PlaceholderScreen>
  );
}
