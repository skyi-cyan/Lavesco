import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="ProfileMain"
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: t('nav.my') }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: t('nav.profileEdit') }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: t('nav.notificationSettings') }}
      />
    </Stack.Navigator>
  );
}
