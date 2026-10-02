import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchRoundByRoundNumber,
  joinRound,
  fetchRoundParticipant,
} from '../../core/services/roundService';
import { formatTeeTime } from '../../core/constants/teeTimes';
import type { Round } from '../../core/types/round';
import type { RoundStackParamList } from '../../app/RoundStack';

type Props = NativeStackScreenProps<RoundStackParamList, 'RoundJoin'>;

const CODE_LENGTH = 6;

const KNOWN_STATUSES = ['DRAFT', 'IN_PROGRESS', 'FINISHED'] as const;
type KnownStatus = (typeof KNOWN_STATUSES)[number];

function isKnownStatus(status: string): status is KnownStatus {
  return (KNOWN_STATUSES as readonly string[]).includes(status);
}

function formatDate(d: Date | null): string {
  if (!d) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function RoundJoinScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [roundNumber, setRoundNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [foundRound, setFoundRound] = useState<Round | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [codeFocused, setCodeFocused] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  // 다른 탭으로 이동하면 참여 화면을 닫아, 라운드 탭 복귀 시 목록이 보이도록 함
  useEffect(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;
    return tabNavigation.addListener('blur', () => {
      navigation.reset({ index: 0, routes: [{ name: 'RoundList' }] });
    });
  }, [navigation]);

  const handleSearch = async () => {
    const trimmed = roundNumber.trim().replace(/\D/g, '');
    if (trimmed.length !== 6 && trimmed.length !== 4) {
      setSearchError(t('roundJoin.invalidNumber'));
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
        setSearchError(t('roundJoin.notFound'));
        return;
      }
      setFoundRound(round);
      if (user?.uid) {
        const me = await fetchRoundParticipant(round.id, user.uid);
        setAlreadyJoined(!!me);
      }
    } catch {
      setSearchError(t('roundJoin.searchError'));
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
        t('roundJoin.joinedTitle'),
        t('roundJoin.joinedMessage'),
        [{ text: t('common.confirm'), onPress: () => navigation.replace('RoundDetail', { roundId: foundRound.id }) }]
      );
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      const message = err?.message ?? t('roundJoin.joinFailedMessage');
      const code = err?.code ? ` (${err.code})` : '';
      Alert.alert(t('roundJoin.joinFailed'), `${message}${code}`);
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
        <Text style={styles.subtitle}>{t('common.loginRequired')}</Text>
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
        <Text style={styles.label}>{t('roundJoin.numberLabel')}</Text>
        <Pressable
          style={styles.codeRow}
          onPress={() => codeInputRef.current?.focus()}
          disabled={searching}
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const activeIndex = Math.min(roundNumber.length, CODE_LENGTH - 1);
            const isActive = codeFocused && i === activeIndex;
            return (
              <View key={i} style={[styles.codeBox, isActive && styles.codeBoxActive]}>
                <Text style={styles.codeDigit}>{roundNumber[i] ?? ''}</Text>
              </View>
            );
          })}
          <TextInput
            ref={codeInputRef}
            style={styles.hiddenInput}
            value={roundNumber}
            onChangeText={(text) => {
              setRoundNumber(text.replace(/\D/g, '').slice(0, CODE_LENGTH));
              setSearchError(null);
            }}
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            editable={!searching}
            autoFocus
            caretHidden
          />
        </Pressable>
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
            <Text style={styles.searchButtonText}>{t('roundJoin.search')}</Text>
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
              <Text style={styles.cardTeeTime}>
                {t('roundJoin.teeTime', { time: formatTeeTime(foundRound.teeTime) })}
              </Text>
            ) : null}
            <View style={styles.cardStatusRow}>
              <Text style={styles.cardStatus}>
                {isKnownStatus(foundRound.status)
                  ? t(`roundJoin.status.${foundRound.status}`)
                  : foundRound.status}
              </Text>
            </View>

            {alreadyJoined ? (
              <>
                <Text style={styles.alreadyJoinedText}>{t('roundJoin.alreadyJoined')}</Text>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={handleOpenRound}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonText}>{t('roundJoin.viewRound')}</Text>
                </TouchableOpacity>
              </>
            ) : foundRound.status === 'FINISHED' ? (
              <Text style={styles.alreadyJoinedText}>{t('roundJoin.finished')}</Text>
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
                  <Text style={styles.joinButtonText}>{t('roundJoin.join')}</Text>
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
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    borderColor: '#1565c0',
    borderWidth: 1.5,
  },
  codeDigit: { fontSize: 22, fontWeight: '700', color: '#111' },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    marginTop: 8,
  },
  searchButton: {
    backgroundColor: '#f97316',
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
