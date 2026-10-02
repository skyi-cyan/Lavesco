import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import { TEE_TIME_OPTIONS, formatTeeTime } from '../../core/constants/teeTimes';
import { fetchGolfCourses } from '../../core/services/courseService';
import { fetchCoursesUnderGolfCourse } from '../../core/services/courseService';
import {
  createRound,
  fetchRound,
  fetchRoundParticipants,
  invalidateRoundCaches,
  updateRound,
} from '../../core/services/roundService';
import { formatFirestoreUserMessage } from '../../core/utils/firestoreRetry';
import type { GolfCourse } from '../../core/types/course';
import type { GolfCourseCourse } from '../../core/types/course';
import type { RoundStackParamList } from '../../app/RoundStack';

type Props = NativeStackScreenProps<RoundStackParamList, 'RoundCreate'>;

type PickerType = 'front_course' | 'back_course' | 'tee_time' | 'date' | null;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatScheduledDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type CourseSnapshot = {
  golfCourseId: string;
  golfCourseName: string;
  frontCourseId: string;
  frontCourseName: string;
  backCourseId: string;
  backCourseName: string;
};

export function RoundCreateScreen({ route, navigation }: Props): React.JSX.Element {
  const editRoundId = route.params?.roundId;
  const isEdit = !!editRoundId;
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const modalBottomPad = Math.max(insets.bottom, 12) + 20;
  const [roundName, setRoundName] = useState('');
  const [golfCourseName, setGolfCourseName] = useState('');
  const [frontCourseNameDirect, setFrontCourseNameDirect] = useState('');
  const [backCourseNameDirect, setBackCourseNameDirect] = useState('');
  const [directInput, setDirectInput] = useState(false);
  const [teeTime, setTeeTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => new Date());
  const [golfCourses, setGolfCourses] = useState<GolfCourse[]>([]);
  const [courses, setCourses] = useState<GolfCourseCourse[]>([]);
  const [selectedGolfCourse, setSelectedGolfCourse] = useState<GolfCourse | null>(null);
  const [frontCourse, setFrontCourse] = useState<GolfCourseCourse | null>(null);
  const [backCourse, setBackCourse] = useState<GolfCourseCourse | null>(null);
  const [pickerOpen, setPickerOpen] = useState<PickerType>(null);
  const [pickYear, setPickYear] = useState(CURRENT_YEAR);
  const [pickMonth, setPickMonth] = useState(new Date().getMonth() + 1);
  const [pickDay, setPickDay] = useState(new Date().getDate());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [golfCourseSearchFocused, setGolfCourseSearchFocused] = useState(false);
  const [editLoading, setEditLoading] = useState(isEdit);
  /** 수정 모드: 스코어가 저장되어 골프장·코스 변경 불가 */
  const [courseLocked, setCourseLocked] = useState(false);
  /** 수정 모드: 확정한 참가자가 있어 수정 자체가 불가 */
  const [editLocked, setEditLocked] = useState(false);
  const initialCourseRef = useRef<CourseSnapshot | null>(null);
  /** 수정 모드: 코스 목록 로드 후 선택해 둘 전·후반 코스 ID */
  const pendingCourseIdsRef = useRef<{ front: string; back: string } | null>(null);

  const openDatePicker = () => {
    setPickYear(scheduledDate.getFullYear());
    setPickMonth(scheduledDate.getMonth() + 1);
    setPickDay(scheduledDate.getDate());
    setPickerOpen('date');
  };
  const confirmDatePicker = () => {
    const maxDay = getDaysInMonth(pickYear, pickMonth);
    const day = Math.min(pickDay, maxDay);
    setScheduledDate(new Date(pickYear, pickMonth - 1, day));
    setPickerOpen(null);
  };
  const dayOptions = Array.from(
    { length: getDaysInMonth(pickYear, pickMonth) },
    (_, i) => i + 1
  );

  const golfCourseSearchQuery = golfCourseName.trim().toLowerCase();
  const filteredGolfCourses = golfCourseSearchQuery
    ? golfCourses.filter(
        (gc) =>
          (gc.name && gc.name.toLowerCase().includes(golfCourseSearchQuery)) ||
          (gc.region && gc.region.toLowerCase().includes(golfCourseSearchQuery))
      )
    : golfCourses;
  const showGolfCourseDropdown = !directInput && golfCourseSearchFocused;

  const loadGolfCourses = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchGolfCourses();
      setGolfCourses(list);
    } catch {
      setGolfCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGolfCourses();
  }, [loadGolfCourses]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? t('nav.roundEdit') : t('nav.roundCreate') });
  }, [navigation, isEdit, t]);

  useEffect(() => {
    if (!editRoundId) return;
    let cancelled = false;
    (async () => {
      try {
        invalidateRoundCaches(editRoundId);
        const [round, participants] = await Promise.all([
          fetchRound(editRoundId),
          fetchRoundParticipants(editRoundId),
        ]);
        if (cancelled) return;
        if (!round) {
          Alert.alert(t('roundCreate.updateFailed'), t('roundDetail.notFound'));
          navigation.goBack();
          return;
        }
        setRoundName(round.roundName ?? '');
        setTeeTime(round.teeTime ?? '');
        if (round.scheduledAt) setScheduledDate(round.scheduledAt);
        setGolfCourseName(round.golfCourseName ?? '');
        initialCourseRef.current = {
          golfCourseId: round.golfCourseId ?? '',
          golfCourseName: round.golfCourseName ?? '',
          frontCourseId: round.frontCourseId ?? '',
          frontCourseName: round.frontCourseName ?? '',
          backCourseId: round.backCourseId ?? '',
          backCourseName: round.backCourseName ?? '',
        };
        if (round.golfCourseId) {
          pendingCourseIdsRef.current = {
            front: round.frontCourseId ?? '',
            back: round.backCourseId ?? '',
          };
          setSelectedGolfCourse({
            id: round.golfCourseId,
            name: round.golfCourseName ?? '',
            region: '',
            status: '',
          });
        } else {
          setDirectInput(true);
          setFrontCourseNameDirect(round.frontCourseName ?? '');
          setBackCourseNameDirect(round.backCourseName ?? '');
        }
        setEditLocked(participants.some((p) => !!p.scoreConfirmedAt));
        setCourseLocked(
          round.status !== 'DRAFT' || participants.some((p) => (p.holesEntered ?? 0) > 0)
        );
      } catch (e) {
        if (cancelled) return;
        Alert.alert(
          t('roundCreate.updateFailed'),
          formatFirestoreUserMessage(e, t('roundCreate.updateFailedMessage'))
        );
        navigation.goBack();
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editRoundId, navigation, t]);

  useEffect(() => {
    if (!selectedGolfCourse) {
      setCourses([]);
      setFrontCourse(null);
      setBackCourse(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCoursesUnderGolfCourse(selectedGolfCourse.id);
        if (!cancelled) {
          setCourses(list);
          const pending = pendingCourseIdsRef.current;
          pendingCourseIdsRef.current = null;
          setFrontCourse(pending ? list.find((c) => c.id === pending.front) ?? null : null);
          setBackCourse(pending ? list.find((c) => c.id === pending.back) ?? null : null);
        }
      } catch {
        if (!cancelled) setCourses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGolfCourse]);

  const handleSelectGolfCourse = (gc: GolfCourse) => {
    setSelectedGolfCourse(gc);
    setGolfCourseName(gc.name);
    setGolfCourseSearchFocused(false);
  };

  const clearGolfCourse = () => {
    setGolfCourseName('');
    setSelectedGolfCourse(null);
    setCourses([]);
    setFrontCourse(null);
    setBackCourse(null);
    setGolfCourseSearchFocused(false);
  };

  const handleSelectFrontCourse = (c: GolfCourseCourse) => {
    setFrontCourse(c);
    if (backCourse?.id === c.id) setBackCourse(null);
    setPickerOpen(null);
  };

  /** 후반코스 옵션: 전반코스로 선택된 코스 제외 */
  const backCourseOptions = frontCourse
    ? courses.filter((c) => c.id !== frontCourse.id)
    : courses;

  const handleSelectBackCourse = (c: GolfCourseCourse) => {
    setBackCourse(c);
    setPickerOpen(null);
  };

  const handleCreate = async () => {
    const gcName = golfCourseName.trim();
    if (!gcName) {
      Alert.alert(t('roundCreate.checkInput'), t('roundCreate.golfCourseRequired'));
      return;
    }
    if (!user?.uid) {
      Alert.alert(t('roundCreate.loginRequiredTitle'), t('roundCreate.loginAgain'));
      return;
    }

    if (!directInput && selectedGolfCourse && !frontCourse) {
      Alert.alert(t('roundCreate.checkInput'), t('roundCreate.frontCourseRequired'));
      return;
    }

    setCreating(true);
    try {
      const round = await createRound(
        user.uid,
        profile?.nickname ?? null,
        {
          roundName: roundName.trim() || null,
          golfCourseId: directInput ? '' : (selectedGolfCourse?.id ?? ''),
          golfCourseName: gcName,
          frontCourseId: directInput ? '' : (frontCourse?.id ?? ''),
          frontCourseName: directInput ? frontCourseNameDirect.trim() : (frontCourse?.name ?? ''),
          backCourseId: directInput ? '' : (backCourse?.id ?? ''),
          backCourseName: directInput ? backCourseNameDirect.trim() : (backCourse?.name ?? ''),
          teeTime: teeTime.trim() || null,
          scheduledAt: scheduledDate,
        }
      );
      // 홈「라운드 만들기」등으로 들어오면 스택에 RoundList가 없어 goBack()이 동작하지 않을 수 있음 → 목록으로 명시적 리셋
      navigation.reset({ index: 0, routes: [{ name: 'RoundList' }] });
      Alert.alert(
        t('roundCreate.createdTitle'),
        t('roundCreate.createdMessage', { number: round.roundNumber ?? '-' }),
        [{ text: t('common.confirm') }]
      );
    } catch (e) {
      const message = formatFirestoreUserMessage(e, t('roundCreate.createFailedMessage'));
      Alert.alert(t('roundCreate.createFailed'), message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRoundId || editLocked) return;
    const gcName = golfCourseName.trim();
    let course: CourseSnapshot | undefined;
    if (!courseLocked) {
      if (!gcName) {
        Alert.alert(t('roundCreate.checkInput'), t('roundCreate.golfCourseRequired'));
        return;
      }
      if (!directInput && selectedGolfCourse && !frontCourse) {
        Alert.alert(t('roundCreate.checkInput'), t('roundCreate.frontCourseRequired'));
        return;
      }
      const next: CourseSnapshot = {
        golfCourseId: directInput ? '' : (selectedGolfCourse?.id ?? ''),
        golfCourseName: gcName,
        frontCourseId: directInput ? '' : (frontCourse?.id ?? ''),
        frontCourseName: directInput ? frontCourseNameDirect.trim() : (frontCourse?.name ?? ''),
        backCourseId: directInput ? '' : (backCourse?.id ?? ''),
        backCourseName: directInput ? backCourseNameDirect.trim() : (backCourse?.name ?? ''),
      };
      const initial = initialCourseRef.current;
      const changed =
        !initial || (Object.keys(next) as (keyof CourseSnapshot)[]).some((k) => next[k] !== initial[k]);
      if (changed) course = next;
    }

    setCreating(true);
    try {
      await updateRound(editRoundId, {
        roundName: roundName.trim() || null,
        teeTime: teeTime.trim() || null,
        scheduledAt: scheduledDate,
        course,
      });
      navigation.goBack();
      Alert.alert(t('roundCreate.updatedTitle'), t('roundCreate.updatedMessage'));
    } catch (e) {
      Alert.alert(
        t('roundCreate.updateFailed'),
        formatFirestoreUserMessage(e, t('roundCreate.updateFailedMessage'))
      );
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>{t('common.loginRequired')}</Text>
      </View>
    );
  }

  if (editLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a0" />
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
        {isEdit && (editLocked || courseLocked) ? (
          <View style={styles.lockNotice}>
            <Ionicons name="lock-closed-outline" size={16} color="#8a6d00" />
            <Text style={styles.lockNoticeText}>
              {editLocked ? t('roundCreate.editLocked') : t('roundCreate.courseLocked')}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>{t('roundCreate.roundName')}</Text>
          <TextInput
            style={styles.input}
            value={roundName}
            onChangeText={setRoundName}
            placeholder={t('roundCreate.roundNamePlaceholder')}
            placeholderTextColor="#999"
          />
        </View>

        <View
          style={[styles.section, courseLocked && styles.sectionLocked]}
          pointerEvents={courseLocked ? 'none' : 'auto'}
        >
          <Text style={styles.label}>{t('roundCreate.golfCourse')}</Text>
          <View style={styles.golfCourseRow}>
            <View style={styles.inputTouchable}>
              <Ionicons name="search" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                value={golfCourseName}
                onChangeText={setGolfCourseName}
                onFocus={() => setGolfCourseSearchFocused(true)}
                onBlur={() => setTimeout(() => setGolfCourseSearchFocused(false), 200)}
                placeholder={
                  directInput
                    ? t('roundCreate.golfCourseNamePlaceholder')
                    : t('roundCreate.golfCourseSearchPlaceholder')
                }
                placeholderTextColor="#999"
                editable={true}
              />
              {golfCourseName.length > 0 ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearGolfCourse}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => {
                setDirectInput(!directInput);
                if (!directInput) {
                  setSelectedGolfCourse(null);
                  setCourses([]);
                  setFrontCourse(null);
                  setBackCourse(null);
                } else {
                  setFrontCourseNameDirect('');
                  setBackCourseNameDirect('');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, directInput && styles.checkboxChecked]}>
                {directInput ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text style={styles.checkLabel}>{t('roundCreate.directInput')}</Text>
            </TouchableOpacity>
          </View>
          {showGolfCourseDropdown ? (
            <View style={styles.dropdown}>
              {filteredGolfCourses.length === 0 ? (
                <Text style={styles.dropdownEmpty}>{t('roundCreate.noResults')}</Text>
              ) : (
                filteredGolfCourses.slice(0, 8).map((gc) => (
                  <TouchableOpacity
                    key={gc.id}
                    style={styles.dropdownRow}
                    onPress={() => handleSelectGolfCourse(gc)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownRowTitle}>{gc.name}</Text>
                    {gc.region ? (
                      <Text style={styles.dropdownRowSub}>{gc.region}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}
        </View>

        <View
          style={[styles.section, courseLocked && styles.sectionLocked]}
          pointerEvents={courseLocked ? 'none' : 'auto'}
        >
          <Text style={styles.label}>{t('roundCreate.frontCourse')}</Text>
          {directInput ? (
            <TextInput
              style={styles.input}
              value={frontCourseNameDirect}
              onChangeText={setFrontCourseNameDirect}
              placeholder={t('roundCreate.frontCoursePlaceholder')}
              placeholderTextColor="#999"
            />
          ) : (
            <TouchableOpacity
              style={styles.selectTouchable}
              onPress={() => courses.length > 0 && setPickerOpen('front_course')}
              disabled={courses.length === 0}
            >
              <Text style={[styles.selectText, !frontCourse && styles.selectPlaceholder]}>
                {frontCourse?.name ?? t('roundCreate.selectCourse')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[styles.section, courseLocked && styles.sectionLocked]}
          pointerEvents={courseLocked ? 'none' : 'auto'}
        >
          <Text style={styles.label}>{t('roundCreate.backCourse')}</Text>
          {directInput ? (
            <TextInput
              style={styles.input}
              value={backCourseNameDirect}
              onChangeText={setBackCourseNameDirect}
              placeholder={t('roundCreate.backCoursePlaceholder')}
              placeholderTextColor="#999"
            />
          ) : (
            <TouchableOpacity
              style={styles.selectTouchable}
              onPress={() => backCourseOptions.length > 0 && setPickerOpen('back_course')}
              disabled={backCourseOptions.length === 0}
            >
              <Text style={[styles.selectText, !backCourse && styles.selectPlaceholder]}>
                {backCourse?.name ??
                  (frontCourse
                    ? backCourseOptions.length > 0
                      ? t('roundCreate.selectCourse')
                      : t('roundCreate.noCourseAvailable')
                    : t('roundCreate.selectFrontFirst'))}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('roundCreate.dateTeeTime')}</Text>
          <View style={styles.dateTeeRow}>
            <TouchableOpacity
              style={[styles.selectTouchable, styles.dateTouchable]}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.selectText}>{formatScheduledDate(scheduledDate)}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectTouchable, styles.teeTouchable]}
              onPress={() => setPickerOpen('tee_time')}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectText, !teeTime && styles.selectPlaceholder]}>
                {teeTime ? formatTeeTime(teeTime) : t('roundCreate.selectTeeTime')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            (creating || (isEdit && editLocked)) && styles.createButtonDisabled,
          ]}
          onPress={isEdit ? handleUpdate : handleCreate}
          disabled={creating || (isEdit && editLocked)}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>
            {isEdit
              ? creating
                ? t('roundCreate.updating')
                : t('roundCreate.editSave')
              : creating
                ? t('roundCreate.creating')
                : t('common.done')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 전반코스 선택 모달 */}
      <Modal
        visible={pickerOpen === 'front_course'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(null)}
        >
          <View
            style={[styles.modalContent, { paddingBottom: modalBottomPad }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('roundCreate.selectFrontCourse')}</Text>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => handleSelectFrontCourse(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  <Text style={styles.modalRowSub}>
                    {t('roundCreate.holeCount', { count: item.holeCount })}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 후반코스 선택 모달 (전반코스로 선택된 코스 제외) */}
      <Modal
        visible={pickerOpen === 'back_course'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(null)}
        >
          <View
            style={[styles.modalContent, { paddingBottom: modalBottomPad }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('roundCreate.selectBackCourse')}</Text>
            <FlatList
              data={backCourseOptions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => handleSelectBackCourse(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  <Text style={styles.modalRowSub}>
                    {t('roundCreate.holeCount', { count: item.holeCount })}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 티타임 선택 모달 */}
      <Modal
        visible={pickerOpen === 'tee_time'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(null)}
        >
          <View
            style={[styles.modalContent, { paddingBottom: modalBottomPad }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('roundCreate.selectTeeTime')}</Text>
            <FlatList
              data={TEE_TIME_OPTIONS}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setTeeTime(item);
                    setPickerOpen(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{formatTeeTime(item)}</Text>
                  {teeTime === item ? (
                    <Ionicons name="checkmark-circle" size={22} color="#0a0" />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 날짜 선택 모달 (년/월/일) */}
      <Modal
        visible={pickerOpen === 'date'}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(null)}
        >
          <View
            style={[styles.modalContent, { paddingBottom: modalBottomPad }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('roundCreate.selectDate')}</Text>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>{t('roundCreate.yearLabel')}</Text>
                <ScrollView style={styles.datePickerScroll} nestedScrollEnabled>
                  {YEAR_OPTIONS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.datePickerItem, pickYear === y && styles.datePickerItemSelected]}
                      onPress={() => setPickYear(y)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.datePickerItemText, pickYear === y && styles.datePickerItemTextSelected]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>{t('roundCreate.monthLabel')}</Text>
                <ScrollView style={styles.datePickerScroll} nestedScrollEnabled>
                  {MONTH_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.datePickerItem, pickMonth === m && styles.datePickerItemSelected]}
                      onPress={() => setPickMonth(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.datePickerItemText, pickMonth === m && styles.datePickerItemTextSelected]}>
                        {t('roundCreate.month', { month: m })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>{t('roundCreate.dayLabel')}</Text>
                <ScrollView style={styles.datePickerScroll} nestedScrollEnabled>
                  {dayOptions.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.datePickerItem, pickDay === d && styles.datePickerItemSelected]}
                      onPress={() => setPickDay(d)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.datePickerItemText, pickDay === d && styles.datePickerItemTextSelected]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.datePickerButtonRow}>
              <TouchableOpacity style={styles.datePickerCancelButton} onPress={() => setPickerOpen(null)} activeOpacity={0.8}>
                <Text style={styles.datePickerCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirmButton} onPress={confirmDatePicker} activeOpacity={0.8}>
                <Text style={styles.datePickerConfirmText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtitle: { fontSize: 14, color: '#666' },
  section: { marginBottom: 20 },
  sectionLocked: { opacity: 0.5 },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  lockNoticeText: { flex: 1, fontSize: 13, color: '#8a6d00', lineHeight: 18 },
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
  inputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    flex: 1,
  },
  inputIcon: { marginLeft: 12 },
  inputWithIcon: { flex: 1, marginLeft: 4, borderWidth: 0, paddingVertical: 12 },
  clearButton: { paddingHorizontal: 8, justifyContent: 'center' },
  golfCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#0a0', borderColor: '#0a0' },
  checkLabel: { fontSize: 14, color: '#333' },
  dropdown: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 280,
    overflow: 'hidden',
  },
  dropdownEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  dropdownRowTitle: { fontSize: 15, color: '#111' },
  dropdownRowSub: { fontSize: 13, color: '#666' },
  selectTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { fontSize: 16, color: '#111' },
  selectPlaceholder: { color: '#999' },
  createButton: {
    backgroundColor: '#0a0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalListContent: {
    paddingBottom: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  modalLoader: { marginVertical: 24 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  modalRowTitle: { fontSize: 16, color: '#111' },
  modalRowSub: { fontSize: 14, color: '#666' },
  dateTeeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTouchable: { flex: 1 },
  teeTouchable: { flex: 1 },
  datePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    maxHeight: 280,
  },
  datePickerColumn: { flex: 1 },
  datePickerColumnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 6,
  },
  datePickerScroll: {
    maxHeight: 240,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  datePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  datePickerItemSelected: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  datePickerItemText: { fontSize: 15, color: '#333' },
  datePickerItemTextSelected: { fontWeight: '700', color: '#0a0' },
  datePickerButtonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  datePickerCancelText: { fontSize: 16, color: '#666', fontWeight: '600' },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0a0',
    alignItems: 'center',
  },
  datePickerConfirmText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
