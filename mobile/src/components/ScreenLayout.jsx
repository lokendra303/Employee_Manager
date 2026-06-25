import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import { MeshBackground } from './motion';
import { colors, spacing } from '../theme';

export default function ScreenLayout({
  title,
  subtitle,
  children,
  scroll = true,
  keyboard = false,
  headerDark = false,
  showNotifications = false,
  onNotificationsPress,
  rightAction,
  contentStyle,
  edges = ['bottom'],
}) {
  const { width } = useWindowDimensions();

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { maxWidth: Math.min(width, 720) }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={keyboard}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  const inner = (
    <>
      {(title || subtitle) && (
        <AppHeader
          title={title}
          subtitle={subtitle}
          dark={headerDark}
          showNotifications={showNotifications}
          onNotificationsPress={onNotificationsPress}
          rightAction={rightAction}
        />
      )}
      {body}
    </>
  );

  if (keyboard) {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        <MeshBackground />
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {inner}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <MeshBackground />
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    width: '100%',
    alignSelf: 'center',
    gap: spacing.md,
  },
});
