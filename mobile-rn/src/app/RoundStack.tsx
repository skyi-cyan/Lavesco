import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoundListScreen } from '../features/round/RoundListScreen';
import { RoundCreateScreen } from '../features/round/RoundCreateScreen';
import { RoundJoinScreen } from '../features/round/RoundJoinScreen';
import { RoundDetailScreen } from '../features/round/RoundDetailScreen';
import {
  CourseWebViewScreen,
  type CourseWebViewParams,
} from '../features/shared/CourseWebViewScreen';

export type RoundStackParamList = {
  RoundList: undefined;
  RoundCreate: undefined;
  RoundJoin: undefined;
  RoundDetail: { roundId: string };
  CourseWebView: CourseWebViewParams;
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
        name="RoundJoin"
        component={RoundJoinScreen}
        options={{ title: '라운드 참여하기' }}
      />
      <Stack.Screen
        name="RoundDetail"
        component={RoundDetailScreen}
        options={{ title: '스코어 등록' }}
      />
      <Stack.Screen
        name="CourseWebView"
        component={CourseWebViewScreen}
        options={{ title: '코스 보기' }}
      />
    </Stack.Navigator>
  );
}
