import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchRoundByRoundNumber,
  joinRound,
  fetchRoundParticipants,
} from '../../core/services/roundService';
import type { Round } from '../../core/types/round';
import type { RoundStackParamList } from '../../app/RoundStack';

type Props = NativeStackScreenProps<RoundStackParamList, 'RoundJoin'>;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '준비',
  IN_PROGRESS: '진행 중',
  FINISHED: '종료',
};

function formatDate(d: Date | null): string {
  if (!d) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function RoundJoinScreen({ navigation }: Props): React.JSX.Element {
  const { user, profile } = useAuth();
  const [roundNumber, setRoundNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [foundRound, setFoundRound] = useState<Round | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = roundNumber.trim().replace(/\D/g, '');
    if (trimmed.length !== 4) {
      setSearchError('4자리 숫자를 입력하세요.');
      setFoundRound(null);
      setAlreadyJoined(false);
      return;
    }
    setSearchError(null);
    setFoundRound(null);
    setAlreadyJoined(false);
    setSearching(true);
    try {
      const round = await fetchRoundByRoundNumber(trimmed);
      if (!round) {
        setSearchError('라운드를 찾을 수 없습니다.');
        return;
      }
      setFoundRound(round);
      if (user?.uid) {
        const participants = await fetchRoundParticipants(round.id);
        setAlreadyJoined(participants.some((p) => p.uid === user.uid));
      }
    } catch {
      setSearchError('검색 중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!user?.uid || !foundRound) return;
    setJoining(true);
    try {
      await joinRound(foundRound.id, user.uid, profile?.nickname ?? null);
      Alert.alert(
        '참여 완료',
        '라운드에 참여했습니다.',
        [{ text: '확인', onPress: () => navigation.replace('RoundDetail', { roundId: foundRound.id }) }]
      );
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      const message = err?.message ?? '참여에 실패했습니다.';
      const code = err?.code ? ` (${err.code})` : '';
      Alert.alert('참여 실패', `${message}${code}`);
    } finally {
      setJoining(false);
    }
  };

  const handleOpenRound = () => {
    if (foundRound) navigation.replace('RoundDetail', { roundId: foundRound.id });
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>로그인이 필요합니다.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.content}>
        <Text style={styles.label}>라운드 번호 (4자리)</Text>
        <TextInput
          style={styles.input}
          value={roundNumber}
          onChangeText={(t) => {
            setRoundNumber(t.replace(/\D/g, '').slice(0, 4));
            setSearchError(null);
          }}
          placeholder="예: 1234"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          maxLength={4}
          editable={!searching}
        />
        {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

        <TouchableOpacity
          style={[styles.searchButton, searching && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={searching}
          activeOpacity={0.8}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>검색</Text>
          )}
        </TouchableOpacity>

        {foundRound ? (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {foundRound.roundName ||
                  `${foundRound.frontCourseName || foundRound.courseName}${foundRound.backCourseName ? ` · ${foundRound.backCourseName}` : ''}`}
              </Text>
              {foundRound.roundNumber ? (
                <Text style={styles.cardRoundNo}>#{foundRound.roundNumber}</Text>
              ) : null}
            </View>
            <View style={styles.cardMetaRow}>
              {foundRound.golfCourseName ? (
                <Text style={styles.cardGolfCourse} numberOfLines={1}>
                  {foundRound.golfCourseName}
                </Text>
              ) : null}
              <Text style={styles.cardDate}>
                {formatDate(foundRound.scheduledAt ?? foundRound.createdAt)}
              </Text>
            </View>
            {foundRound.teeTime ? (
              <Text style={styles.cardTeeTime}>티타임 {foundRound.teeTime}</Text>
            ) : null}
            <View style={styles.cardStatusRow}>
              <Text style={styles.cardStatus}>
                {STATUS_LABEL[foundRound.status] ?? foundRound.status}
              </Text>
            </View>

            {alreadyJoined ? (
              <>
                <Text style={styles.alreadyJoinedText}>이미 참여 중인 라운드입니다.</Text>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={handleOpenRound}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonText}>라운드 보기</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, joining && styles.buttonDisabled]}
                onPress={handleJoin}
                disabled={joining}
                activeOpacity={0.8}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.joinButtonText}>참여하기</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subtitle: { fontSize: 14, color: '#666' },
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
    fontSize: 18,
    color: '#111',
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    marginTop: 8,
  },
  searchButton: {
    backgroundColor: '#1565c0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1 },
  cardRoundNo: { fontSize: 13, color: '#0a0', fontWeight: '600' },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  cardGolfCourse: { fontSize: 14, color: '#1a5f2a', fontWeight: '600', flex: 1 },
  cardDate: { fontSize: 13, color: '#666' },
  cardTeeTime: { fontSize: 13, color: '#666', marginTop: 4 },
  cardStatusRow: { marginTop: 8 },
  cardStatus: { fontSize: 12, color: '#666' },
  alreadyJoinedText: {
    fontSize: 14,
    color: '#0a0',
    marginTop: 12,
    marginBottom: 8,
  },
  joinButton: {
    backgroundColor: '#0a0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
