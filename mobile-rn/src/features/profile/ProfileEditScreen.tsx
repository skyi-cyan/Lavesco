import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../core/auth/AuthContext';
import { updateUserProfile } from '../../core/services/profileService';
import type { ProfileStackParamList } from '../../app/ProfileStack';

const DEFAULT_TEE_OPTIONS: { value: string; label: string }[] = [
  { value: 'black', label: 'Black' },
  { value: 'blue', label: 'Blue' },
  { value: 'white', label: 'White' },
  { value: 'red', label: 'Red' },
];

/** 숫자만 추출 후 YYYY-MM-DD 형태로 하이픈 자동 삽입 (최대 8자리) */
function formatDateOfBirthInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/**
 * Promise.race + 타임아웃. 한쪽이 먼저 끝나면 `clearTimeout`으로 타이머를 취소해,
 * 나중에 타임아웃 Promise가 reject 되며 뜨는 Uncaught (in promise)를 막습니다.
 */
function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileEdit'>;

export function ProfileEditScreen({ navigation }: Props): React.JSX.Element {
  const { user, profile, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [handicap, setHandicap] = useState('');
  const [defaultTee, setDefaultTee] = useState<string>('white');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? '');
      setHandicap(profile.handicap != null ? String(profile.handicap) : '');
      setDefaultTee(profile.defaultTee ?? 'white');
      setAddress(profile.address ?? '');
      setDateOfBirth(profile.dateOfBirth ?? '');
    }
  }, [profile]);

  const SAVE_TIMEOUT_MS = 12000;

  const handleSave = async () => {
    if (!user?.uid) return;
    setError(null);
    setSaving(true);
    let savePromise: Promise<void> | undefined;
    try {
      const handicapNum = handicap.trim() === '' ? null : parseFloat(handicap.trim());
      if (handicap.trim() !== '' && (Number.isNaN(handicapNum as number) || (handicapNum as number) < 0 || (handicapNum as number) > 54)) {
        setError('핸디캡은 0~54 사이 숫자를 입력해주세요.');
        setSaving(false);
        return;
      }
      const dobTrimmed = dateOfBirth.trim();
      if (dobTrimmed && !/^\d{4}-\d{2}-\d{2}$/.test(dobTrimmed)) {
        setError('생년월일은 YYYY-MM-DD 형식으로 입력해주세요. (예: 1990-01-15)');
        setSaving(false);
        return;
      }
      savePromise = updateUserProfile(user.uid, {
        nickname: nickname.trim() || null,
        handicap: handicapNum,
        defaultTee: defaultTee || null,
        address: address.trim() || null,
        dateOfBirth: dobTrimmed || null,
      });
      await raceWithTimeout(
        savePromise,
        SAVE_TIMEOUT_MS,
        '저장 시간이 초과되었습니다. 네트워크를 확인해주세요.'
      );

      setSaving(false);
      navigation.goBack();
      refreshProfile().catch(() => {});
    } catch (e) {
      void savePromise?.catch(() => {});
      setSaving(false);
      const err = e as Error & { code?: string };
      let message = err?.message ?? '저장에 실패했습니다.';
      if (err?.code === 'permission-denied' || err?.code === 'PERMISSION_DENIED' || message.includes('PERMISSION_DENIED')) {
        message = '저장 권한이 없습니다. 로그아웃 후 다시 로그인해 주세요.';
      }
      setError(message);
      Alert.alert('저장 실패', message);
    }
  };

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>프로필을 불러올 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor="#999"
            autoCapitalize="none"
            maxLength={20}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>주소</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="주소를 입력하세요"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>생년월일</Text>
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={(text) => setDateOfBirth(formatDateOfBirthInput(text))}
            placeholder="숫자만 입력 (예: 19900115)"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>핸디캡</Text>
          <TextInput
            style={styles.input}
            value={handicap}
            onChangeText={setHandicap}
            placeholder="0~54 (비워두면 미설정)"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>기본 티</Text>
          <View style={styles.teeRow}>
            {DEFAULT_TEE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.teeChip, defaultTee === opt.value && styles.teeChipSelected]}
                onPress={() => setDefaultTee(opt.value)}
                activeOpacity={0.7}
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtitle: { fontSize: 14, color: '#666' },
  section: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
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
    backgroundColor: '#0a0',
    borderColor: '#0a0',
  },
  teeChipText: { fontSize: 14, color: '#333', fontWeight: '500' },
  teeChipTextSelected: { color: '#fff' },
  errorText: { fontSize: 14, color: '#c00', marginBottom: 12 },
  saveButton: {
    backgroundColor: '#0a0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
