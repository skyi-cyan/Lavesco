import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoundListScreen } from '../features/round/RoundListScreen';
import { RoundCreateScreen } from '../features/round/RoundCreateScreen';
import { RoundDetailScreen } from '../features/round/RoundDetailScreen';

export type RoundStackParamList = {
  RoundList: undefined;
  RoundCreate: undefined;
  RoundDetail: { roundId: string };
};

const Stack = createNativeStackNavigator<RoundStackParamList>();

export function RoundStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="RoundList"
    >
      <Stack.Screen
        name="RoundList"
        component={RoundListScreen}
        options={{ title: '라운드' }}
      />
      <Stack.Screen
        name="RoundCreate"
        component={RoundCreateScreen}
        options={{ title: '라운드 만들기' }}
      />
      <Stack.Screen
        name="RoundDetail"
        component={RoundDetailScreen}
        options={{ title: '스코어 등록' }}
      />
    </Stack.Navigator>
  );
}
