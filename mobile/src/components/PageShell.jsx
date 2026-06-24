import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from './ui';
import { colors } from '../theme';

/** Full-height layout for stack screens (fixes blank pages on Expo web). */
export default function PageShell({ children, title, subtitle }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Screen title={title} subtitle={subtitle}>
        {children}
      </Screen>
    </SafeAreaView>
  );
}
