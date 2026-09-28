import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: true }}
      initialRouteName="CourseList"
    >
      <Stack.Screen
        name="CourseList"
        component={CourseListScreen}
        options={{ title: t('nav.course') }}
      />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={({ route }) => ({
          title: route.params.courseName ?? t('nav.courseDetail'),
        })}
      />
      <Stack.Screen
        name="CourseWebView"
        component={CourseWebViewScreen}
        options={{ title: t('nav.courseView') }}
      />
    </Stack.Navigator>
  );
}
