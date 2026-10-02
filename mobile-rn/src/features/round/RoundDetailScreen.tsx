import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import {
  saveRoundScore,
  confirmRoundScore,
  subscribeRound,
  subscribeRoundParticipants,
  subscribeRoundScores,
  removeRoundParticipant,
  finishRound,
} from '../../core/services/roundService';
import { formatFirestoreUserMessage } from '../../core/utils/firestoreRetry';
import { ActionSheet, type ActionSheetItem } from '../shared/ActionSheet';
import { grossStrokesForHole, playScoreSound } from '../../core/services/scoreSoundService';
import { fetchHolesUnderCourse, fetchCoursesUnderGolfCourse } from '../../core/services/courseService';
import type { Round } from '../../core/types/round';
import type { RoundParticipant } from '../../core/types/round';
import type { HoleScoreData } from '../../core/types/round';
import type { GolfCourseHoleInput } from '../../core/types/course';
import type { RoundStackParamList } from '../../app/RoundStack';

const HOLE_NUMBERS_FRONT = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HOLE_NUMBERS_BACK = ['10', '11', '12', '13', '14', '15', '16', '17', '18'];
const ALL_HOLE_NUMBERS = [...HOLE_NUMBERS_FRONT, ...HOLE_NUMBERS_BACK];
const DEFAULT_TEE = 'white';
const USERS_COLLECTION = 'users';
const SCORE_ONBOARDING_SEEN_AT = 'scoreOnboardingSeenAt';

type ViewNine = 'front' | 'back';

type Props = NativeStackScreenProps<RoundStackParamList, 'RoundDetail'>;

function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export function RoundDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { roundId } = route.params;
  const { t } = useTranslation();
  const { user } = useAuth();
  const [round, setRound] = useState<Round | null>(null);
  const [participants, setParticipants] = useState<RoundParticipant[]>([]);
  const [scoresByUid, setScoresByUid] = useState<Record<string, Record<string, HoleScoreData>>>({});
  const [frontHoleInfo, setFrontHoleInfo] = useState<Record<string, GolfCourseHoleInput>>({});
  const [backHoleInfo, setBackHoleInfo] = useState<Record<string, GolfCourseHoleInput>>({});
  const [courseUrlById, setCourseUrlById] = useState<Record<string, string>>({});
  const [viewNine, setViewNine] = useState<ViewNine>('front');
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  /** 현재 홀 입력 중인 값(미저장). 저장 버튼을 눌러야만 scoresByUid에 반영됨 */
  const [draftHoleScore, setDraftHoleScore] = useState<HoleScoreData>({ strokes: 0, putts: 0 });
  const [savingHole, setSavingHole] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [kickPickerVisible, setKickPickerVisible] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  /** 본인이 나가기를 눌렀을 때 "내보내짐" 안내를 띄우지 않기 위함 */
  const leavingRef = useRef(false);

  const holeNumbers = viewNine === 'front' ? HOLE_NUMBERS_FRONT : HOLE_NUMBERS_BACK;
  const currentHoleNo = holeNumbers[currentHoleIndex];
  const holeInfoKey = viewNine === 'front' ? currentHoleNo : String(currentHoleIndex + 1);
  const holeInfo = viewNine === 'front' ? frontHoleInfo : backHoleInfo;
  const holePar = holeInfo[holeInfoKey]?.par ?? 4;
  const holeDistance = holeInfo[holeInfoKey]?.distances?.[DEFAULT_TEE] ?? 0;
  const courseNameForHole =
    viewNine === 'front'
      ? (round?.frontCourseName || round?.golfCourseName || '-')
      : (round?.backCourseName || round?.golfCourseName || '-');
  const hasBackCourse = !!(round?.backCourseId && (round?.backCourseName || round?.golfCourseName));
  const currentCourseUrl = viewNine === 'front'
    ? (round?.frontCourseId ? courseUrlById[round.frontCourseId] : '')
    : (round?.backCourseId ? courseUrlById[round.backCourseId] : '');
  const hasCurrentCourseUrl = !!(currentCourseUrl && currentCourseUrl.trim());

  const openCourseView = async () => {
    const normalized = normalizeExternalUrl(currentCourseUrl ?? '');
    if (!normalized) return;
    navigation.navigate('CourseWebView', {
      url: normalized,
      title:
        courseNameForHole !== '-'
          ? t('roundDetail.courseTitle', { name: courseNameForHole })
          : t('nav.courseView'),
    });
  };

  /** 현재 홀 변경 시 draft를 저장된 값(또는 기본값)으로 동기화. 스코어 미입력 시 par 기준 0으로 둠. */
  useEffect(() => {
    const saved = user?.uid ? scoresByUid[user.uid]?.[currentHoleNo] : undefined;
    const initial: HoleScoreData =
      saved != null
        ? {
            strokes: grossStrokesForHole(saved.strokes, holePar),
            putts: saved.putts ?? 0,
            fairway: saved.fairway,
            rough: saved.rough,
            penalty: saved.penalty,
            ob: saved.ob,
          }
        : { strokes: holePar, putts: 0 };
    setDraftHoleScore(initial);
    // 동반자 스코어가 바뀔 때 입력 중인 값이 초기화되지 않도록 내 현재 홀 값에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHoleNo, user?.uid, user?.uid ? scoresByUid[user.uid]?.[currentHoleNo] : undefined, holePar]);

  // 라운드 문서 실시간 구독: 개설자의 정보 수정·라운드 종료가 바로 반영됨
  useEffect(() => {
    if (!roundId) return;
    setLoading(true);
    return subscribeRound(
      roundId,
      (data) => {
        setRound(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [roundId]);

  const golfCourseId = round?.golfCourseId ?? '';
  const frontCourseId = round?.frontCourseId ?? '';
  const backCourseId = round?.backCourseId ?? '';

  useEffect(() => {
    let cancelled = false;
    const toObj = (map: Map<string, GolfCourseHoleInput>) => {
      const obj: Record<string, GolfCourseHoleInput> = {};
      map.forEach((v, k) => {
        obj[k] = v;
      });
      return obj;
    };
    (async () => {
      if (!golfCourseId) {
        setCourseUrlById({});
        setFrontHoleInfo({});
        setBackHoleInfo({});
        return;
      }
      const [courseList, frontMap, backMap] = await Promise.all([
        fetchCoursesUnderGolfCourse(golfCourseId).catch(() => []),
        frontCourseId
          ? fetchHolesUnderCourse(golfCourseId, frontCourseId).catch(() => null)
          : Promise.resolve(null),
        backCourseId
          ? fetchHolesUnderCourse(golfCourseId, backCourseId).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const urlMap: Record<string, string> = {};
      courseList.forEach((c) => {
        if (c.courseUrl) urlMap[c.id] = c.courseUrl;
      });
      setCourseUrlById(urlMap);
      setFrontHoleInfo(frontMap ? toObj(frontMap) : {});
      setBackHoleInfo(backMap ? toObj(backMap) : {});
    })();
    return () => {
      cancelled = true;
    };
  }, [golfCourseId, frontCourseId, backCourseId]);

  // 참가자·스코어는 실시간 구독: 동반자가 저장·확정하면 바로 스코어카드에 반영
  useEffect(() => {
    if (!roundId || !user?.uid) return;
    let unsubParticipants: (() => void) | null = null;
    let unsubScores: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retried = false;

    const subscribe = () => {
      unsubParticipants = subscribeRoundParticipants(roundId, setParticipants, handleError);
      unsubScores = subscribeRoundScores(
        roundId,
        (changes) => {
          setScoresByUid((prev) => {
            const next = { ...prev };
            changes.forEach(({ uid, holes }) => {
              if (holes) next[uid] = holes;
              else delete next[uid];
            });
            return next;
          });
        },
        handleError
      );
    };
    const unsubscribeAll = () => {
      unsubParticipants?.();
      unsubScores?.();
      unsubParticipants = null;
      unsubScores = null;
    };
    // 참여 직후 권한 반영이 늦거나 일시적 오류일 때 한 번 재구독
    function handleError() {
      if (retried) return;
      retried = true;
      unsubscribeAll();
      retryTimer = setTimeout(subscribe, 1000);
    }

    subscribe();
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribeAll();
    };
  }, [roundId, user?.uid]);

  const myParticipant = user?.uid ? participants.find((p) => p.uid === user.uid) : null;
  const isScoreConfirmed = !!myParticipant?.scoreConfirmedAt;
  const isFinished = round?.status === 'FINISHED';
  const isHost = !!user?.uid && round?.createdBy === user.uid;
  const isReadOnly = isScoreConfirmed || isFinished;

  // 내보내졌거나 라운드가 취소되면 목록으로 이동
  const wasParticipantRef = useRef(false);
  useEffect(() => {
    if (myParticipant) {
      wasParticipantRef.current = true;
      return;
    }
    if (!wasParticipantRef.current || leavingRef.current) return;
    wasParticipantRef.current = false;
    Alert.alert(t('common.notice'), t('roundDetail.removedFromRound'), [
      { text: t('common.confirm'), onPress: () => navigation.popToTop() },
    ]);
  }, [myParticipant, navigation, t]);

  useEffect(() => {
    let mounted = true;
    const checkScoreOnboarding = async () => {
      if (!user?.uid) return;
      try {
        const doc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
        const seenAt = doc.data()?.[SCORE_ONBOARDING_SEEN_AT];
        if (!seenAt && mounted) {
          setOnboardingVisible(true);
        }
      } catch {
        // 안내 팝업 조회 실패 시 사용자 흐름을 막지 않음
      }
    };
    checkScoreOnboarding();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const handleCloseOnboarding = useCallback(async () => {
    if (!user?.uid) {
      setOnboardingVisible(false);
      return;
    }
    setOnboardingVisible(false);
    try {
      await firestore()
        .collection(USERS_COLLECTION)
        .doc(user.uid)
        .set({ [SCORE_ONBOARDING_SEEN_AT]: firestore.Timestamp.now() }, { merge: true });
    } catch {
      // 저장 실패 시에도 모달은 닫고 다음 진입 시 재노출될 수 있음
    }
  }, [user?.uid]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            onPress={() => setOnboardingVisible(true)}
            style={styles.headerHelpButton}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={16} color="#1565c0" />
            <Text style={styles.headerHelpButtonText}>{t('roundDetail.help')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.headerMenuButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('roundDetail.menu')}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, t]);

  /** 현재 홀 draft만 수정 (저장 버튼을 눌러야 반영됨) */
  const updateDraft = useCallback((updater: (prev: HoleScoreData) => HoleScoreData) => {
    setDraftHoleScore((prev) => updater(prev));
  }, []);

  /** toPar 기준 변경: 0=par, -1=birdie, -2=eagle, +1=bogey … → strokes = par + toPar (최소 1타) */
  const setStrokes = (delta: number) => {
    updateDraft((h) => ({
      ...h,
      strokes: Math.max(1, (h.strokes ?? holePar) + delta),
    }));
  };
  /** toPar 표시용: strokes → 0 / -1 / -2 / +1 / +2 … */
  const toParDisplay = (strokes: number) => {
    const toPar = strokes - holePar;
    return toPar === 0 ? '0' : toPar > 0 ? `+${toPar}` : `${toPar}`;
  };
  /** 숫자 toPar(=gross-par) 포맷팅 (+면 + prefix) */
  const formatToParValue = (toPar: number) =>
    toPar === 0 ? '0' : toPar > 0 ? `${toPar}` : `${toPar}`;
  /** Out/In/Total 요약 행용: 양수는 `+N` 표기 */
  const formatToParValueWithPlus = (toPar: number) =>
    toPar === 0 ? '0' : toPar > 0 ? `+${toPar}` : `${toPar}`;
  const setPutts = (delta: number) => {
    updateDraft((h) => ({ ...h, putts: Math.max(0, (h.putts ?? 0) + delta) }));
  };
  const toggleFairway = () => {
    updateDraft((h) => ({ ...h, fairway: h.fairway ? false : true }));
  };
  const toggleRough = () => {
    updateDraft((h) => ({ ...h, rough: h.rough ? false : true }));
  };
  const togglePenalty = () => {
    updateDraft((h) => ({ ...h, penalty: h.penalty ? false : true }));
  };
  const toggleOb = () => {
    updateDraft((h) => ({ ...h, ob: h.ob ? 0 : 1 }));
  };

  /** 홀 번호(1~18)에 해당하는 par. 전반은 frontHoleInfo, 후반은 backHoleInfo 키 1~9 */
  const getParForHoleNo = useCallback(
    (no: string): number => {
      const n = parseInt(no, 10);
      if (n <= 9) return frontHoleInfo[no]?.par ?? 4;
      return backHoleInfo[String(n - 9)]?.par ?? 4;
    },
    [frontHoleInfo, backHoleInfo]
  );

  /** 현재 홀 저장: Firestore 저장 성공 시에만 scoresByUid 반영, 사운드 재생 */
  const normalizeMyHolesForPersist = useCallback(
    (holes: Record<string, HoleScoreData>): Record<string, HoleScoreData> => {
      const out = { ...holes };
      for (const no of ALL_HOLE_NUMBERS) {
        const h = out[no];
        if (!h) continue;
        const par = getParForHoleNo(no);
        out[no] = { ...h, strokes: grossStrokesForHole(h.strokes, par) };
      }
      return out;
    },
    [getParForHoleNo]
  );

  const handleSaveCurrentHole = useCallback(async () => {
    if (!user?.uid || !roundId) return;
    setSavingHole(true);
    const par = getParForHoleNo(currentHoleNo);
    const holeScore: HoleScoreData = {
      ...draftHoleScore,
      strokes: grossStrokesForHole(draftHoleScore.strokes, par),
    };
    const nextHoles = { ...(scoresByUid[user.uid] ?? {}), [currentHoleNo]: holeScore };
    try {
      await saveRoundScore(roundId, user.uid, nextHoles);
      setScoresByUid((s) => ({ ...s, [user.uid]: nextHoles }));
      playScoreSound(nextHoles, currentHoleNo, holeScore.strokes, getParForHoleNo);
      if (currentHoleIndex < holeNumbers.length - 1) {
        setCurrentHoleIndex(currentHoleIndex + 1);
      } else if (viewNine === 'front' && hasBackCourse) {
        setViewNine('back');
        setCurrentHoleIndex(0);
      }
    } catch (e) {
      Alert.alert(
        t('roundDetail.saveFailed'),
        formatFirestoreUserMessage(e, t('roundDetail.saveFailedMessage'))
      );
    } finally {
      setSavingHole(false);
    }
  }, [
    roundId,
    user?.uid,
    currentHoleNo,
    currentHoleIndex,
    holeNumbers.length,
    viewNine,
    hasBackCourse,
    draftHoleScore,
    scoresByUid,
    getParForHoleNo,
    t,
  ]);

  const getOutTotal = (uid: string): number => {
    const holes = scoresByUid[uid] ?? {};
    return HOLE_NUMBERS_FRONT.reduce(
      (sum, no) => sum + grossStrokesForHole(holes[no]?.strokes, getParForHoleNo(no)),
      0
    );
  };

  const getInTotal = (uid: string): number => {
    const holes = scoresByUid[uid] ?? {};
    return HOLE_NUMBERS_BACK.reduce(
      (sum, no) => sum + grossStrokesForHole(holes[no]?.strokes, getParForHoleNo(no)),
      0
    );
  };

  const getTotal = (uid: string): number => getOutTotal(uid) + getInTotal(uid);

  /** 전반 9홀 par 합계 */
  const parOut = HOLE_NUMBERS_FRONT.reduce((sum, no) => sum + getParForHoleNo(no), 0);
  /** 후반 9홀 par 합계 */
  const parIn = HOLE_NUMBERS_BACK.reduce((sum, no) => sum + getParForHoleNo(no), 0);

  /** 스코어 vs par에 따른 폰트 색상: 언더 파 녹색, 파 검정, 오버 파 빨강 */
  const getScoreColor = useCallback(
    (strokes: number, par: number): string => {
      if (strokes <= 0) return '#333333';
      if (strokes < par) return '#1b5e20';
      if (strokes > par) return '#c62828';
      return '#333333';
    },
    []
  );

  const toggleViewNine = () => {
    if (hasBackCourse) setViewNine((v) => (v === 'front' ? 'back' : 'front'));
  };

  const displayName = (p: RoundParticipant) =>
    p.nickname || p.uid.slice(0, 6) || '-';

  /** 스코어카드 순서: 본인 → 개설자 → 나머지(이름순) */
  const orderedParticipants = [...participants].sort((a, b) => {
    const rank = (p: RoundParticipant) =>
      p.uid === user?.uid ? 0 : p.uid === round?.createdBy ? 1 : 2;
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : displayName(a).localeCompare(displayName(b));
  });

  /** 18홀 모두 저장된 경우에만 스코어 확정 버튼 활성화 */
  const all18HolesSaved =
    !!user?.uid &&
    ALL_HOLE_NUMBERS.every((no) => scoresByUid[user.uid]?.[no] !== undefined);

  const handleConfirmScore = useCallback(async () => {
    if (!user?.uid || !roundId || confirming || isReadOnly || !all18HolesSaved) return;
    const holes = normalizeMyHolesForPersist(scoresByUid[user.uid] ?? {});
    setConfirming(true);
    try {
      await confirmRoundScore(roundId, user.uid, holes);
      Alert.alert(t('roundDetail.confirmScore'), t('roundDetail.confirmed'));
    } catch (e) {
      const message = (e as Error)?.message ?? t('roundDetail.confirmFailedMessage');
      Alert.alert(t('roundDetail.confirmFailed'), message);
    } finally {
      setConfirming(false);
    }
  }, [roundId, user?.uid, scoresByUid, confirming, isReadOnly, all18HolesSaved, normalizeMyHolesForPersist, t]);

  const anyConfirmed = participants.some((p) => !!p.scoreConfirmedAt);
  const allConfirmed = participants.length > 0 && participants.every((p) => !!p.scoreConfirmedAt);
  const kickableParticipants = participants.filter(
    (p) => p.uid !== round?.createdBy && !p.scoreConfirmedAt
  );

  const runAction = useCallback(
    async (action: () => Promise<void>, failTitle: string) => {
      if (actionBusy) return;
      setActionBusy(true);
      try {
        await action();
      } catch (e) {
        Alert.alert(failTitle, formatFirestoreUserMessage(e, t('common.tryAgainLater')));
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, t]
  );

  const handleFinishRound = useCallback(() => {
    Alert.alert(t('roundDetail.finishTitle'), t('roundDetail.finishMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('roundDetail.finishAction'),
        onPress: () =>
          runAction(async () => {
            await finishRound(roundId);
            Alert.alert(t('roundDetail.finishTitle'), t('roundDetail.finishDone'));
          }, t('roundDetail.finishFailed')),
      },
    ]);
  }, [roundId, runAction, t]);

  const handleKick = useCallback(
    (target: RoundParticipant) => {
      const name = target.nickname || target.uid.slice(0, 6);
      Alert.alert(t('roundDetail.kickTitle'), t('roundDetail.kickMessage', { name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('roundDetail.kickAction'),
          style: 'destructive',
          onPress: () =>
            runAction(async () => {
              await removeRoundParticipant(roundId, target.uid);
              Alert.alert(t('roundDetail.kickTitle'), t('roundDetail.kickDone', { name }));
            }, t('roundDetail.kickFailed')),
        },
      ]);
    },
    [roundId, runAction, t]
  );

  const handleLeave = useCallback(() => {
    Alert.alert(t('roundDetail.leaveTitle'), t('roundDetail.leaveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('roundDetail.leaveAction'),
        style: 'destructive',
        onPress: () =>
          runAction(async () => {
            leavingRef.current = true;
            try {
              await removeRoundParticipant(roundId);
            } catch (e) {
              leavingRef.current = false;
              throw e;
            }
            navigation.popToTop();
          }, t('roundDetail.leaveFailed')),
      },
    ]);
  }, [roundId, runAction, navigation, t]);

  const menuItems: ActionSheetItem[] = isHost
    ? [
        {
          key: 'edit',
          label: t('roundDetail.menuEdit'),
          icon: 'create-outline',
          disabledReason: isFinished
            ? t('roundDetail.disabledFinished')
            : anyConfirmed
              ? t('roundDetail.editDisabledConfirmed')
              : undefined,
          onPress: () => navigation.navigate('RoundCreate', { roundId }),
        },
        {
          key: 'kick',
          label: t('roundDetail.menuKick'),
          icon: 'person-remove-outline',
          disabledReason: isFinished
            ? t('roundDetail.disabledFinished')
            : kickableParticipants.length === 0
              ? t('roundDetail.kickDisabledNone')
              : undefined,
          onPress: () => setKickPickerVisible(true),
        },
        {
          key: 'finish',
          label: t('roundDetail.menuFinish'),
          icon: 'flag-outline',
          disabledReason: isFinished
            ? t('roundDetail.disabledFinished')
            : !allConfirmed
              ? t('roundDetail.finishDisabledUnconfirmed')
              : undefined,
          onPress: handleFinishRound,
        },
      ]
    : [
        {
          key: 'leave',
          label: t('roundDetail.menuLeave'),
          icon: 'exit-outline',
          destructive: true,
          disabledReason: isFinished
            ? t('roundDetail.disabledFinished')
            : isScoreConfirmed
              ? t('roundDetail.leaveDisabledConfirmed')
              : undefined,
          onPress: handleLeave,
        },
      ];

  const kickItems: ActionSheetItem[] = kickableParticipants.map((p) => ({
    key: p.uid,
    label: displayName(p),
    icon: 'person-outline',
    destructive: true,
    onPress: () => handleKick(p),
  }));

  const highlight = <Text style={styles.onboardingHighlight} />;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
      </View>
    );
  }

  if (!round) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>{t('roundDetail.notFound')}</Text>
        <TouchableOpacity
          style={styles.notFoundButton}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.8}
        >
          <Text style={styles.notFoundButtonText}>{t('roundDetail.backToList')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Modal
        visible={onboardingVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseOnboarding}
      >
        <View style={styles.onboardingOverlay}>
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitle}>{t('roundDetail.onboardingTitle')}</Text>
            {(['step1', 'step1Note', 'step2', 'step2Note', 'step3', 'step3Note'] as const).map((step) => (
              <Text key={step} style={styles.onboardingText}>
                <Trans i18nKey={`roundDetail.onboarding.${step}`} components={{ h: highlight }} />
              </Text>
            ))}
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={handleCloseOnboarding}
              activeOpacity={0.85}
            >
              <Text style={styles.onboardingButtonText}>{t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ActionSheet
        visible={menuVisible}
        title={t('roundDetail.menuTitle')}
        items={menuItems}
        onClose={() => setMenuVisible(false)}
      />
      <ActionSheet
        visible={kickPickerVisible}
        title={t('roundDetail.kickPickerTitle')}
        items={kickItems}
        onClose={() => setKickPickerVisible(false)}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.holeCard}>
        {/* 홀 네비게이션 */}
        <View style={styles.holeNav}>
        <TouchableOpacity
          style={styles.holeNavSide}
          onPress={() => setCurrentHoleIndex((i) => Math.max(0, i - 1))}
          disabled={currentHoleIndex === 0}
        >
          <Ionicons name="chevron-back" size={18} color={currentHoleIndex === 0 ? '#ccc' : '#333'} />
          <Text style={styles.holeNavLabel}>
            {currentHoleIndex > 0 ? `${holeNumbers[currentHoleIndex - 1]} Hole` : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.holeCircle}>
          <Text style={styles.holeCircleText}>{currentHoleNo}</Text>
        </View>
        <TouchableOpacity
          style={styles.holeNavSide}
          onPress={() => setCurrentHoleIndex((i) => Math.min(holeNumbers.length - 1, i + 1))}
          disabled={currentHoleIndex === holeNumbers.length - 1}
        >
          <Text style={styles.holeNavLabel}>
            {currentHoleIndex < holeNumbers.length - 1 ? `${holeNumbers[currentHoleIndex + 1]} Hole` : ''}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentHoleIndex === holeNumbers.length - 1 ? '#ccc' : '#333'}
          />
        </TouchableOpacity>
      </View>

      {/* 1줄: 코스명 · Par · 거리 / 2줄: 전환 안내 · 코스 뷰 */}
      <View style={styles.holeInfoBlock}>
        <View style={styles.holeInfoRowTop}>
          <TouchableOpacity
            style={styles.holeInfoCourseWrap}
            onPress={toggleViewNine}
            disabled={!hasBackCourse}
            activeOpacity={hasBackCourse ? 0.7 : 1}
          >
            <Text style={[styles.holeInfoCourse, !hasBackCourse && styles.holeInfoCourseDisabled]} numberOfLines={1}>
              {courseNameForHole}
            </Text>
          </TouchableOpacity>
          <Text style={styles.holeInfoPar}>Par {holePar}</Text>
          <View style={styles.holeInfoRight}>
            <Text style={styles.holeInfoDistance}>{holeDistance > 0 ? `${holeDistance}m` : '-'}</Text>
          </View>
        </View>
        {(hasBackCourse || hasCurrentCourseUrl) ? (
          <View
            style={[
              styles.holeInfoRowBottom,
              !hasBackCourse && styles.holeInfoRowBottomAlignEnd,
            ]}
          >
            {hasBackCourse ? (
              <TouchableOpacity
                style={styles.holeInfoHintWrap}
                onPress={toggleViewNine}
                activeOpacity={0.7}
              >
                <Text style={styles.holeInfoCourseHint} numberOfLines={2}>
                  {viewNine === 'front'
                    ? t('roundDetail.switchToBack')
                    : t('roundDetail.switchToFront')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.holeInfoHintWrap} />
            )}
            {hasCurrentCourseUrl ? (
              <TouchableOpacity
                style={styles.courseViewButton}
                onPress={openCourseView}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={14} color="#0a0" />
                <Text style={styles.courseViewButtonText}>{t('roundDetail.courseView')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
      </View>

      <View style={styles.inputCard}>
      {/* SCORE: par 기준 0=par, -1=birdie, -2=eagle, +1=bogey … / PUTT (확정 시 읽기 전용) */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreBlockLabel, styles.scoreLabelColor]}>SCORE (to Par)</Text>
          <View style={styles.scoreControl}>
            {!isReadOnly && (
              <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnGreen]} onPress={() => setStrokes(-1)}>
                <Ionicons name="remove" size={24} color="#2e7d32" />
              </TouchableOpacity>
            )}
            <Text style={styles.scoreValue}>
              {toParDisplay(draftHoleScore.strokes ?? holePar)}
            </Text>
            {!isReadOnly && (
              <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnGreen]} onPress={() => setStrokes(1)}>
                <Ionicons name="add" size={24} color="#2e7d32" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreBlockLabel, styles.puttLabelColor]}>PUTT</Text>
          <View style={styles.scoreControl}>
            {!isReadOnly && (
              <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnBlue]} onPress={() => setPutts(-1)}>
                <Ionicons name="remove" size={24} color="#1565c0" />
              </TouchableOpacity>
            )}
            <Text style={styles.scoreValue}>{draftHoleScore.putts}</Text>
            {!isReadOnly && (
              <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnBlue]} onPress={() => setPutts(1)}>
                <Ionicons name="add" size={24} color="#1565c0" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Fairway, Rough, Penalty, OB (확정 시 읽기 전용) */}
      <View style={styles.checkRow}>
        {isReadOnly ? (
          <>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, draftHoleScore.fairway && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Fairway</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, draftHoleScore.rough && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Rough</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, draftHoleScore.penalty && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Penalty</Text>
            </View>
            <View style={styles.checkItem}>
              <View style={[styles.checkbox, (draftHoleScore.ob ?? 0) > 0 && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>OB</Text>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.checkItem} onPress={toggleFairway}>
              <View style={[styles.checkbox, draftHoleScore.fairway && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Fairway</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkItem} onPress={toggleRough}>
              <View style={[styles.checkbox, draftHoleScore.rough && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Rough</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkItem} onPress={togglePenalty}>
              <View style={[styles.checkbox, draftHoleScore.penalty && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Penalty</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkItem} onPress={toggleOb}>
              <View style={[styles.checkbox, (draftHoleScore.ob ?? 0) > 0 && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>OB</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 홀 저장 + 스코어 확정 (한 줄, 확정 시 뱃지만 표시) */}
      {user?.uid && (
        <View style={styles.confirmSection}>
          {isReadOnly ? (
            <View style={styles.confirmBadge}>
              <Ionicons
                name={isFinished ? 'flag' : 'checkmark-circle'}
                size={18}
                color={isFinished ? '#1565c0' : '#0a0'}
              />
              <Text style={[styles.confirmBadgeText, isFinished && styles.finishedBadgeText]}>
                {isFinished ? t('roundDetail.finishedBadge') : t('roundDetail.confirmedBadge')}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveHoleButton, savingHole && styles.saveHoleButtonDisabled]}
                  onPress={handleSaveCurrentHole}
                  disabled={savingHole}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveHoleButtonText}>
                    {savingHole
                      ? t('roundDetail.saving')
                      : t('roundDetail.saveHole', { hole: currentHoleNo })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (confirming || !all18HolesSaved) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirmScore}
                  disabled={confirming || !all18HolesSaved}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>
                    {confirming ? t('roundDetail.confirming') : t('roundDetail.confirmScore')}
                  </Text>
                </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </View>

      {/* Out / In / Total 합계 */}
      {user?.uid && (
        (() => {
          const uid = user.uid;
          const outTotal = getOutTotal(uid);
          const inTotal = getInTotal(uid);
          const total = getTotal(uid);
          const outToPar = outTotal - parOut;
          const inToPar = inTotal - parIn;
          const totalToPar = total - (parOut + parIn);
          const hasOut = outTotal > 0;
          const hasIn = inTotal > 0;
          const hasTotal = total > 0;

          const outColor = hasOut ? getScoreColor(outTotal, parOut) : '#333333';
          const inColor = hasIn ? getScoreColor(inTotal, parIn) : '#333333';
          const totalColor = hasTotal ? getScoreColor(total, parOut + parIn) : '#333333';

          return (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Out</Text>
                <Text style={styles.summaryValue}>
                  {hasOut ? outTotal : '－'}
                  {hasOut ? ' ' : null}
                  {hasOut ? (
                    <Text style={{ color: outColor }}>
                      ({formatToParValueWithPlus(outToPar)})
                    </Text>
                  ) : null}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>In</Text>
                <Text style={styles.summaryValue}>
                  {hasIn ? inTotal : '－'}
                  {hasIn ? ' ' : null}
                  {hasIn ? (
                    <Text style={{ color: inColor }}>
                      ({formatToParValueWithPlus(inToPar)})
                    </Text>
                  ) : null}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>
                  {hasTotal ? total : '－'}
                  {hasTotal ? ' ' : null}
                  {hasTotal ? (
                    <Text style={{ color: totalColor }}>
                      ({formatToParValueWithPlus(totalToPar)})
                    </Text>
                  ) : null}
                </Text>
              </View>
            </View>
          );
        })()
      )}

      {/* 스코어카드 테이블 */}
      <View style={styles.tableWrap}>
        <View style={styles.tableHeaderBlock}>
          <View style={styles.tableHeader}>
            <View style={[styles.tableCell, styles.tableCellName]}>
              <Text style={styles.tableHeaderText} />
            </View>
            {holeNumbers.map((no) => (
              <View key={no} style={styles.tableCell}>
                <Text style={styles.tableHeaderText}>{no}</Text>
              </View>
            ))}
            <View style={styles.tableCell}>
              <Text style={styles.tableHeaderText}>{viewNine === 'front' ? 'Out' : 'In'}</Text>
            </View>
          </View>
          <View style={styles.tableHeaderParRow}>
            <View style={[styles.tableCell, styles.tableCellName, styles.tableCellPar]}>
              <Text style={styles.tableParRowText}>Par</Text>
            </View>
            {holeNumbers.map((no) => (
              <View key={`par-${no}`} style={[styles.tableCell, styles.tableCellPar]}>
                <Text style={styles.tableParRowText}>{getParForHoleNo(no)}</Text>
              </View>
            ))}
            <View style={[styles.tableCell, styles.tableCellPar]}>
              <Text style={styles.tableParRowText}>{viewNine === 'front' ? parOut : parIn}</Text>
            </View>
          </View>
        </View>
        {orderedParticipants.map((p) => {
          const outTotal = getOutTotal(p.uid);
          const inTotal = getInTotal(p.uid);
          const sumForView = viewNine === 'front' ? outTotal : inTotal;
          const parForView = viewNine === 'front' ? parOut : parIn;
          const isMe = p.uid === user?.uid;
          return (
            <View key={p.uid} style={[styles.tableRow, isMe && styles.tableRowMe]}>
              <View style={[styles.tableCell, styles.tableCellName]}>
                <Text style={[styles.tableNameText, isMe && styles.tableNameTextMe]} numberOfLines={1}>
                  {displayName(p)}
                </Text>
              </View>
              {holeNumbers.map((no) => {
                const saved = scoresByUid[p.uid]?.[no];
                const par = getParForHoleNo(no);
                const gross = grossStrokesForHole(saved?.strokes, par);
                const toPar = gross - par;
                const isSaved = saved !== undefined;
                const cellColor = isSaved ? getScoreColor(gross, par) : '#333333';
                return (
                  <View key={no} style={styles.tableCell}>
                    {!isSaved ? (
                      <Text style={[styles.tableCellText, { color: '#333333' }]}>－</Text>
                    ) : gross < par ? (
                      <View style={styles.heartWrap}>
                        <Ionicons name="heart-outline" size={18} color="#e11d48" />
                        <Text style={styles.heartText}>{formatToParValue(toPar)}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.tableCellText, { color: cellColor }]}>
                        {formatToParValue(toPar)}
                      </Text>
                    )}
                  </View>
                );
              })}
              <View style={styles.tableCell}>
                {/** Out/In 합계: (현재 총점=gross 합) + (괄호: toPar 합) */}
                {(() => {
                  const sumToPar = sumForView - parForView;
                  return (
                <Text
                  style={[
                    styles.tableCellText,
                    {
                      color:
                        sumForView > 0
                          ? getScoreColor(sumForView, parForView)
                          : '#333333',
                    },
                  ]}
                >
                  {sumForView > 0 ? formatToParValue(sumToPar) : '－'}
                </Text>
                  );
                })()}
              </View>
            </View>
          );
        })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 15, color: '#555', textAlign: 'center', paddingHorizontal: 24 },
  notFoundButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0a0',
  },
  notFoundButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerMenuButton: { paddingHorizontal: 2, paddingVertical: 2 },
  finishedBadgeText: { color: '#1565c0' },
  onboardingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  onboardingCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  onboardingText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  onboardingHighlight: {
    color: '#f57c00',
    fontWeight: '800',
  },
  onboardingButton: {
    marginTop: 8,
    backgroundColor: '#0a0',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  onboardingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  headerHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  headerHelpButtonText: {
    fontSize: 11,
    color: '#1565c0',
    fontWeight: '700',
  },
  holeCard: {
    backgroundColor: '#f1f8e9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c5e1a5',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 12,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  holeNavSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  holeNavLabel: { fontSize: 12, color: '#666' },
  holeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeCircleText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  holeInfoBlock: {
    borderTopWidth: 1,
    borderTopColor: '#c5e1a5',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  holeInfoRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holeInfoRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 6,
  },
  holeInfoRowBottomAlignEnd: {
    justifyContent: 'flex-end',
  },
  holeInfoHintWrap: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
  holeInfoCourseWrap: { flex: 1, minWidth: 0 },
  holeInfoCourse: { fontSize: 15, fontWeight: '600', color: '#1a5f2a' },
  holeInfoCourseDisabled: { color: '#888' },
  holeInfoCourseHint: { fontSize: 10, color: '#888' },
  holeInfoRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  courseViewButton: {
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#86efac',
    flexShrink: 0,
  },
  courseViewButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0a0',
  },
  holeInfoPar: { fontSize: 22, fontWeight: '800', color: '#c00', textAlign: 'center', marginHorizontal: 6, flexShrink: 0 },
  holeInfoDistance: { fontSize: 15, fontWeight: '600', color: '#1565c0', textAlign: 'right', flexShrink: 0 },
  scoreRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreBlockLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8, letterSpacing: 0.3 },
  scoreLabelColor: { color: '#2e7d32' },
  puttLabelColor: { color: '#1565c0' },
  scoreBtnGreen: { borderColor: '#81c784', backgroundColor: '#f1f8e9' },
  scoreBtnBlue: { borderColor: '#90caf9', backgroundColor: '#e3f2fd' },
  scoreControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 28, fontWeight: '700', color: '#111', minWidth: 44, textAlign: 'center' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  checkItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 4,
  },
  checkboxChecked: { backgroundColor: '#0a0', borderColor: '#0a0' },
  checkLabel: { fontSize: 14, color: '#333' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#1b5e20' },
  summaryDivider: { width: 1, height: 24, backgroundColor: '#ddd' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveHoleButton: {
    flex: 1,
    backgroundColor: '#1565c0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveHoleButtonDisabled: { opacity: 0.6 },
  saveHoleButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirmSection: {},
  confirmButton: {
    flex: 1,
    backgroundColor: '#0a0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    alignSelf: 'center',
  },
  confirmBadgeText: { fontSize: 14, fontWeight: '600', color: '#1b5e20' },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  tableHeaderBlock: {
    backgroundColor: '#2e7d32',
    borderBottomWidth: 1,
    borderBottomColor: '#1b5e20',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  tableHeaderParRow: {
    flexDirection: 'row',
  },
  tableCellPar: {
    paddingVertical: 4,
  },
  tableParRowText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tableCell: {
    width: 28,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '800',
    color: '#1b5e20',
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
  },
  tableCellName: {
    width: 48,
    minWidth: 48,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  tableNameText: { fontSize: 13, color: '#111' },
  tableRowMe: { backgroundColor: '#fffde7' },
  tableNameTextMe: { fontWeight: '700' },
  tableCellText: { fontSize: 13, color: '#333' },
});
