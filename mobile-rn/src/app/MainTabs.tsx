import React from 'react';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeScreen } from '../features/home/HomeScreen';
import { RoundStack, type RoundStackParamList } from './RoundStack';
import { CourseStack } from './CourseStack';
import { ProfileStack } from './ProfileStack';

export type MainTabParamList = {
  Home: undefined;
  Round: NavigatorScreenParams<RoundStackParamList>;
  Course: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<string, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Round: { focused: 'flag', unfocused: 'flag-outline' },
  Course: { focused: 'map', unfocused: 'map-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
};

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'Course',
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcons[route.name];
          const name = icons ? (focused ? icons.focused : icons.unfocused) : 'ellipse-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0a0',
        tabBarInactiveTintColor: '#888',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '홈', tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="Round"
        component={RoundStack}
        options={{ title: '라운드', tabBarLabel: '라운드', headerShown: false }}
      />
      <Tab.Screen
        name="Course"
        component={CourseStack}
        options={{ title: '코스', tabBarLabel: '코스', headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ title: 'MY', tabBarLabel: 'MY', headerShown: false }}
      />
    </Tab.Navigator>
  );
}
