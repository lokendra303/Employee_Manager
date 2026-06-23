import { SafeAreaView } from 'react-native-safe-area-context';
import ApiServerPicker from '../components/ApiServerPicker';
import { colors } from '../theme';

export default function ApiSettingsScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ApiServerPicker onSaved={() => navigation.goBack()} />
    </SafeAreaView>
  );
}
