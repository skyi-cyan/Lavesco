import React from 'react';
import { useAuth } from '../core/auth/AuthContext';
import { SplashScreen } from '../features/auth/SplashScreen';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

type AuthState = { user: unknown; loading: boolean };

/**
 * 조건부 렌더만 수행 (훅 없음). 훅은 RootNavigator에서만 사용해 Rules of Hooks 준수.
 */
function RootNavigatorContent({ user, loading }: AuthState): React.JSX.Element {
  if (loading) return <SplashScreen />;
  if (!user) return <AuthStack />;
  return <MainTabs />;
}

/**
 * 인증 상태에 따라 Splash / 로그인·회원가입 / 메인 탭 표시
 */
export function RootNavigator(): React.JSX.Element {
  const { user, loading } = useAuth();
  return <RootNavigatorContent user={user} loading={loading} />;
}
