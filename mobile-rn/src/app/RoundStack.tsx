import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="RoundList"
    >
      <Stack.Screen
        name="RoundList"
        component={RoundListScreen}
        options={{ title: t('nav.round') }}
      />
      <Stack.Screen
        name="RoundCreate"
        component={RoundCreateScreen}
        options={{ title: t('nav.roundCreate') }}
      />
      <Stack.Screen
        name="RoundJoin"
        component={RoundJoinScreen}
        options={{ title: t('nav.roundJoin') }}
      />
      <Stack.Screen
        name="RoundDetail"
        component={RoundDetailScreen}
        options={{ title: t('nav.roundDetail') }}
      />
      <Stack.Screen
        name="CourseWebView"
        component={CourseWebViewScreen}
        options={{ title: t('nav.courseView') }}
      />
    </Stack.Navigator>
  );
}
