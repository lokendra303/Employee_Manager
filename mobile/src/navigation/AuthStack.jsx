import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SystemAdminLoginScreen from '../screens/SystemAdminLoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SystemAdminLogin" component={SystemAdminLoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterOrganizationScreen}
        options={{ headerShown: true, title: 'Register Organization' }}
      />
    </Stack.Navigator>
  );
}
