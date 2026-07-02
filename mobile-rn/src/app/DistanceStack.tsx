import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DistanceListScreen } from '../features/distance/DistanceListScreen';
import { DistanceRecordScreen } from '../features/distance/DistanceRecordScreen';

export type DistanceStackParamList = {
  DistanceList: undefined;
  DistanceRecord: undefined;
};

const Stack = createNativeStackNavigator<DistanceStackParamList>();

export function DistanceStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }} initialRouteName="DistanceList">
      <Stack.Screen
        name="DistanceList"
        component={DistanceListScreen}
        options={{ title: '거리기록' }}
      />
      <Stack.Screen
        name="DistanceRecord"
        component={DistanceRecordScreen}
        options={{ title: '새 거리 기록' }}
      />
    </Stack.Navigator>
  );
}
