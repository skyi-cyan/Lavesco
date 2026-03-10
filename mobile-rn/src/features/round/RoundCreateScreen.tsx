import React, { useCallback, useEffect, useState } from 'react';
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import { fetchGolfCourses } from '../../core/services/courseService';
import { fetchCoursesUnderGolfCourse } from '../../core/services/courseService';
import { createRound } from '../../core/services/roundService';
import type { GolfCourse } from '../../core/types/course';
import type { GolfCourseCourse } from '../../core/types/course';
import type { RoundStackParamList } from '../../app/RoundStack';

type Props = NativeStackScreenProps<RoundStackParamList, 'RoundCreate'>;

type PickerType = 'front_course' | 'back_course' | 'tee_time' | 'date' | null;

/** 티타임: 1부, 2부, 3부 */
const TEE_TIME_OPTIONS = ['1부', '2부', '3부'];

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

export function RoundCreateScreen({ navigation }: Props): React.JSX.Element {
  const { user, profile } = useAuth();
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
          setFrontCourse(null);
          setBackCourse(null);
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
      Alert.alert('입력 확인', '골프장을 입력하거나 선택해주세요.');
      return;
    }
    if (!user?.uid) return;

    if (!directInput && selectedGolfCourse && !frontCourse) {
      Alert.alert('입력 확인', '전반 코스를 선택해주세요.');
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
      setCreating(false);
      Alert.alert(
        '라운드 생성 완료',
        `라운드가 생성되었습니다.\n\n라운드 번호: ${round.roundNumber ?? '-'}`,
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      setCreating(false);
      const message = (e as Error)?.message ?? '라운드 생성에 실패했습니다.';
      Alert.alert('생성 실패', message);
    }
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>라운드(대회)명</Text>
          <TextInput
            style={styles.input}
            value={roundName}
            onChangeText={setRoundName}
            placeholder="라운드 또는 대회 이름 (선택)"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>골프장</Text>
          <View style={styles.golfCourseRow}>
            <View style={styles.inputTouchable}>
              <Ionicons name="search" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                value={golfCourseName}
                onChangeText={setGolfCourseName}
                onFocus={() => setGolfCourseSearchFocused(true)}
                onBlur={() => setTimeout(() => setGolfCourseSearchFocused(false), 200)}
                placeholder={directInput ? '골프장 이름 입력' : '골프장 검색 (이름·지역)'}
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
              <Text style={styles.checkLabel}>직접입력</Text>
            </TouchableOpacity>
          </View>
          {showGolfCourseDropdown ? (
            <View style={styles.dropdown}>
              {filteredGolfCourses.length === 0 ? (
                <Text style={styles.dropdownEmpty}>검색 결과가 없습니다.</Text>
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

        <View style={styles.section}>
          <Text style={styles.label}>전반코스</Text>
          {directInput ? (
            <TextInput
              style={styles.input}
              value={frontCourseNameDirect}
              onChangeText={setFrontCourseNameDirect}
              placeholder="전반코스 이름 입력 (선택)"
              placeholderTextColor="#999"
            />
          ) : (
            <TouchableOpacity
              style={styles.selectTouchable}
              onPress={() => courses.length > 0 && setPickerOpen('front_course')}
              disabled={courses.length === 0}
            >
              <Text style={[styles.selectText, !frontCourse && styles.selectPlaceholder]}>
                {frontCourse?.name ?? '코스 선택'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>후반코스</Text>
          {directInput ? (
            <TextInput
              style={styles.input}
              value={backCourseNameDirect}
              onChangeText={setBackCourseNameDirect}
              placeholder="후반코스 이름 입력 (선택)"
              placeholderTextColor="#999"
            />
          ) : (
            <TouchableOpacity
              style={styles.selectTouchable}
              onPress={() => backCourseOptions.length > 0 && setPickerOpen('back_course')}
              disabled={backCourseOptions.length === 0}
            >
              <Text style={[styles.selectText, !backCourse && styles.selectPlaceholder]}>
                {backCourse?.name ?? (frontCourse ? (backCourseOptions.length > 0 ? '코스 선택' : '선택 가능한 코스 없음') : '전반코스 선택 후 가능')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>날짜 / 티타임</Text>
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
                {teeTime || '티타임 선택'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, creating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={creating}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>
            {creating ? '만들기 중...' : '완료'}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>전반코스 선택</Text>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => handleSelectFrontCourse(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  <Text style={styles.modalRowSub}>{item.holeCount}홀</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>후반코스 선택</Text>
            <FlatList
              data={backCourseOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => handleSelectBackCourse(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{item.name}</Text>
                  <Text style={styles.modalRowSub}>{item.holeCount}홀</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>티타임 선택</Text>
            <FlatList
              data={TEE_TIME_OPTIONS}
              keyExtractor={(t) => t}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setTeeTime(item);
                    setPickerOpen(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRowTitle}>{item}</Text>
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
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>날짜 선택</Text>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>년</Text>
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
                <Text style={styles.datePickerColumnLabel}>월</Text>
                <ScrollView style={styles.datePickerScroll} nestedScrollEnabled>
                  {MONTH_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.datePickerItem, pickMonth === m && styles.datePickerItemSelected]}
                      onPress={() => setPickMonth(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.datePickerItemText, pickMonth === m && styles.datePickerItemTextSelected]}>
                        {m}월
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>일</Text>
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
                <Text style={styles.datePickerCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirmButton} onPress={confirmDatePicker} activeOpacity={0.8}>
                <Text style={styles.datePickerConfirmText}>확인</Text>
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
    paddingBottom: 24,
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
