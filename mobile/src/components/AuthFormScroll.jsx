import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Scroll + keyboard wrapper for auth forms. Avoids Android keyboard dismiss
 * from automaticallyAdjustKeyboardInsets and keeps focus while typing.
 */
export default function AuthFormScroll({ children, contentContainerStyle, scrollRef }) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 24) + 24 },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
