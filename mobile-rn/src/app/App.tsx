/**
 * 라베스코 골프 스코어 공유 앱 - React Native
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, initAuth } from '../core/auth/AuthContext';
import { RootNavigator } from './RootNavigator';

function AppRoot(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Google 로그인용: Firebase Console > 프로젝트 설정 > 앱 > Android OAuth 웹 클라이언트 ID
    // 필요 시 아래처럼 문자열로 넣거나, react-native-config 등으로 환경 변수 사용
    initAuth('93038383892-7es29i9jjs3h0lgb8fp8n57fppmft9pg.apps.googleusercontent.com'); // 예: initAuth('123456-xxx.apps.googleusercontent.com');
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default AppRoot;
