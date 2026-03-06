import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { authService, configureGoogleSignIn } from './authService';
import type { UserProfile } from '../types/userProfile';
import { userProfileFromMap } from '../types/userProfile';

type AuthState = {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    nickname: string,
    terms: { serviceTerms: boolean; privacyPolicy: boolean; marketing: boolean }
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_COLLECTION = 'users';

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const doc = await firestore().collection(USERS_COLLECTION).doc(uid).get();
      if (doc.exists && doc.data()) {
        setProfile(userProfileFromMap(doc.data() as Record<string, unknown>));
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const credential = await authService.signInWithEmail(email, password);
    if (credential.user) await loadProfile(credential.user.uid);
  }, [loadProfile]);

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      nickname: string,
      terms: { serviceTerms: boolean; privacyPolicy: boolean; marketing: boolean }
    ) => {
      setError(null);
      const credential = await authService.signUpWithEmail(email, password, nickname, {
        ...terms,
        agreedAt: new Date(),
      });
      if (credential.user) await loadProfile(credential.user.uid);
    },
    [loadProfile]
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const credential = await authService.signInWithGoogle();
    if (credential.user) await loadProfile(credential.user.uid);
  }, [loadProfile]);

  const signInWithApple = useCallback(async () => {
    setError(null);
    const credential = await authService.signInWithApple();
    if (credential.user) await loadProfile(credential.user.uid);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    setError(null);
    await authService.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshProfile = useCallback(async () => {
    if (user?.uid) await loadProfile(user.uid);
  }, [user?.uid, loadProfile]);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * 앱 최상단에서 호출. Google Sign-In webClientId 설정 (Firebase Console에서 복사)
 */
export function initAuth(googleWebClientId?: string): void {
  configureGoogleSignIn(googleWebClientId);
}
