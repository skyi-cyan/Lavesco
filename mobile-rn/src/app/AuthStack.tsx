import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SignUpScreen } from '../features/auth/SignUpScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="Login"
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({ navigation }) => ({
          title: '로그인',
          headerShown: true,
          headerRight: () => null,
        })}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: '회원가입' }}
      />
    </Stack.Navigator>
  );
}
