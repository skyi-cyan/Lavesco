import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ProfileEditScreen } from '../features/profile/ProfileEditScreen';
import { NotificationSettingsScreen } from '../features/profile/NotificationSettingsScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ProfileEdit: undefined;
  NotificationSettings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="ProfileMain"
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: '프로필' }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: '프로필 수정' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: '알림 설정' }}
      />
    </Stack.Navigator>
  );
}
