import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { DistanceListScreen } from '../features/distance/DistanceListScreen';
import { DistanceRecordScreen } from '../features/distance/DistanceRecordScreen';

export type DistanceStackParamList = {
  DistanceList: undefined;
  DistanceRecord: undefined;
};

const Stack = createNativeStackNavigator<DistanceStackParamList>();

export function DistanceStack(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }} initialRouteName="DistanceList">
      <Stack.Screen
        name="DistanceList"
        component={DistanceListScreen}
        options={{ title: t('nav.distanceTitle') }}
      />
      <Stack.Screen
        name="DistanceRecord"
        component={DistanceRecordScreen}
        options={{ title: t('nav.distanceRecord') }}
      />
    </Stack.Navigator>
  );
}
