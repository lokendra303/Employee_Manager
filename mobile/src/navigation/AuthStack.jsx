import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import ApiSettingsScreen from '../screens/ApiSettingsScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="ApiSettings"
        component={ApiSettingsScreen}
        options={{ headerShown: true, title: 'API URL' }}
      />
    </Stack.Navigator>
  );
}