import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SignUpScreen } from '../features/auth/SignUpScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="Login"
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t('nav.login'),
          headerShown: true,
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: t('nav.signUp') }}
      />
    </Stack.Navigator>
  );
}
