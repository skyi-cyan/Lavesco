'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getAuthInstance() {
  if (typeof window === 'undefined') return null;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

async function assertAdminUser(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult(true);
  return token.claims.admin === true;
}

type AuthState = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthInstance();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const admin = await assertAdminUser(u);
        if (!admin) {
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(u);
          setIsAdmin(true);
        }
      } catch {
        await firebaseSignOut(auth);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getAuthInstance();
    if (!auth) throw new Error('Auth not initialized');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const admin = await assertAdminUser(cred.user);
    if (!admin) {
      await firebaseSignOut(auth);
      throw new Error('관리자 권한이 없습니다. admin 클레임을 부여해 주세요.');
    }
  };

  const signInWithGoogle = async () => {
    const auth = getAuthInstance();
    if (!auth) throw new Error('Auth not initialized');
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const admin = await assertAdminUser(cred.user);
    if (!admin) {
      await firebaseSignOut(auth);
      throw new Error('관리자 권한이 없습니다. admin 클레임을 부여해 주세요.');
    }
  };

  const signOut = async () => {
    const auth = getAuthInstance();
    if (auth) await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, loading, signIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
