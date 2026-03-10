import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../core/auth/AuthContext';
import { validateEmail, validatePassword } from '../../shared/utils/validators';
import type { AuthStackParamList } from '../../app/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

/** 당분간 구글 로그인 비활성화 (인증 정보 이슈) */
const GOOGLE_LOGIN_ENABLED = false;

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const {
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    loading: authLoading,
    error,
    clearError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const showError = (message: string) => {
    Alert.alert('알림', message.replace(/^Error: /, ''));
  };

  const handleEmailLogin = async () => {
    clearError();
    const e = validateEmail(email);
    const p = validatePassword(password);
    setEmailError(e);
    setPasswordError(p);
    if (e || p) return;

    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || authLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconBox}>
          <Text style={styles.icon}>⛳</Text>
        </View>
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>골프 라운드를 시작하세요</Text>

        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          placeholder="이메일"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <TextInput
          style={[styles.input, passwordError && styles.inputError]}
          placeholder="비밀번호"
          placeholderTextColor="#999"
          value={password}
          onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
          secureTextEntry
          editable={!isLoading}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleEmailLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>로그인</Text>
          )}
        </TouchableOpacity>

        {(GOOGLE_LOGIN_ENABLED || Platform.OS === 'ios') && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {GOOGLE_LOGIN_ENABLED && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>Google로 로그인</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={isLoading}
          >
            <Text style={styles.appleButtonText}>Apple로 로그인</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>계정이 없으신가요? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            disabled={isLoading}
          >
            <Text style={styles.footerLink}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingTop: 40 },
  iconBox: { alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a5f2a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: { borderColor: '#c00' },
  errorText: { fontSize: 12, color: '#c00', marginBottom: 12 },
  primaryButton: {
    backgroundColor: '#1a5f2a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 16, color: '#888', fontSize: 14 },
  socialButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: { fontSize: 16, color: '#333' },
  appleButton: { backgroundColor: '#000' },
  appleButtonText: { color: '#fff', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#666' },
  footerLink: { fontSize: 14, color: '#1a5f2a', fontWeight: '600' },
});
