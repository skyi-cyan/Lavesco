import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CourseListScreen } from '../features/course/CourseListScreen';
import { CourseDetailScreen } from '../features/course/CourseDetailScreen';
import {
  CourseWebViewScreen,
  type CourseWebViewParams,
} from '../features/shared/CourseWebViewScreen';

export type CourseStackParamList = {
  CourseList: undefined;
  CourseDetail: { courseId: string; courseName?: string };
  CourseWebView: CourseWebViewParams;
};

const Stack = createNativeStackNavigator<CourseStackParamList>();

export function CourseStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="CourseList"
    >
      <Stack.Screen
        name="CourseList"
        component={CourseListScreen}
        options={{ title: '코스' }}
      />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={({ route }) => ({
          title: route.params.courseName ?? '코스 상세',
        })}
      />
      <Stack.Screen
        name="CourseWebView"
        component={CourseWebViewScreen}
        options={{ title: '코스 보기' }}
      />
    </Stack.Navigator>
  );
}
