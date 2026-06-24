import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { ApiConfigProvider, useApiConfig } from './src/context/ApiConfigContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthStack from './src/navigation/AuthStack';
import AppNavigator from './src/navigation/AppNavigator';
import { LoadingView } from './src/components/ui';

function RootNavigator() {
  const { bootstrapping: apiBoot } = useApiConfig();
  const { user, bootstrapping: authBoot } = useAuth();

  if (apiBoot || authBoot) {
    return <LoadingView label="Starting..." />;
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style={Platform.OS === 'android' ? 'dark' : 'auto'} />
      <ApiConfigProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ApiConfigProvider>
    </SafeAreaProvider>
  );
}
