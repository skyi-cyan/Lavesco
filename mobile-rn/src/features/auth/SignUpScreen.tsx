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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateNickname,
} from '../../shared/utils/validators';
import type { AuthStackParamList } from '../../app/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
const DEFAULT_TEE_OPTIONS: { value: string; label: string }[] = [
  { value: 'black', label: 'Black' },
  { value: 'blue', label: 'Blue' },
  { value: 'white', label: 'White' },
  { value: 'red', label: 'Red' },
];

export function SignUpScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { signUpWithEmail, loading: authLoading, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [defaultTee, setDefaultTee] = useState('white');
  const [serviceTerms, setServiceTerms] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const showError = (message: string) => {
    Alert.alert(t('common.notice'), message.replace(/^Error: /, ''));
  };

  const handleSignUp = async () => {
    clearError();
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);
    const nickErr = validateNickname(nickname);
    setErrors({
      email: emailErr,
      password: pwErr,
      confirmPassword: confirmErr,
      nickname: nickErr,
    });
    if (emailErr || pwErr || confirmErr || nickErr) return;
    if (!serviceTerms || !privacyPolicy) {
      showError(t('auth.requiredTerms'));
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, nickname, {
        serviceTerms,
        privacyPolicy,
        marketing,
      }, defaultTee);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || authLoading;

  const checkbox = (checked: boolean, onToggle: () => void, label: string, required?: boolean) => (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onToggle}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>
        {required ? '*' : ''} {label}
      </Text>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>{t('auth.signUp')}</Text>

        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder={t('auth.email')}
          placeholderTextColor="#999"
          value={email}
          onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: null })); }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder={t('auth.passwordHint')}
          placeholderTextColor="#999"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null })); }}
          secureTextEntry
          editable={!isLoading}
        />
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <TextInput
          style={[styles.input, errors.confirmPassword && styles.inputError]}
          placeholder={t('auth.confirmPassword')}
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            setErrors((e) => ({ ...e, confirmPassword: null }));
          }}
          secureTextEntry
          editable={!isLoading}
        />
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        ) : null}

        <TextInput
          style={[styles.input, errors.nickname && styles.inputError]}
          placeholder={t('auth.nickname')}
          placeholderTextColor="#999"
          value={nickname}
          onChangeText={(t) => { setNickname(t); setErrors((e) => ({ ...e, nickname: null })); }}
          editable={!isLoading}
        />
        {errors.nickname ? <Text style={styles.errorText}>{errors.nickname}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.label}>{t('auth.defaultTee')}</Text>
          <View style={styles.teeRow}>
            {DEFAULT_TEE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.teeChip, defaultTee === opt.value && styles.teeChipSelected]}
                onPress={() => setDefaultTee(opt.value)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.teeChipText,
                    defaultTee === opt.value && styles.teeChipTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.terms}>
          {checkbox(serviceTerms, () => setServiceTerms((v) => !v), t('auth.agreeService'), true)}
          {checkbox(privacyPolicy, () => setPrivacyPolicy((v) => !v), t('auth.agreePrivacy'), true)}
          {checkbox(marketing, () => setMarketing((v) => !v), t('auth.agreeMarketing'))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('auth.submitSignUp')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.footerLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a5f2a', marginBottom: 24 },
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
  section: { marginBottom: 12 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  teeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  teeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  teeChipSelected: {
    backgroundColor: '#1a5f2a',
    borderColor: '#1a5f2a',
  },
  teeChipText: { fontSize: 14, color: '#333', fontWeight: '500' },
  teeChipTextSelected: { color: '#fff' },
  terms: { marginVertical: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#1a5f2a',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#1a5f2a' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkLabel: { flex: 1, fontSize: 14, color: '#333' },
  primaryButton: {
    backgroundColor: '#1a5f2a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#666' },
  footerLink: { fontSize: 14, color: '#1a5f2a', fontWeight: '600' },
});
