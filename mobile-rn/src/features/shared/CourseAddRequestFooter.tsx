import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchMyCourseAddRequests,
  submitCourseAddRequest,
  type CourseAddRequest,
} from '../../core/services/courseRequestService';

const REQUEST_STATUS_LABEL: Record<CourseAddRequest['status'], string> = {
  PENDING: '접수',
  IN_PROGRESS: '처리중',
  COMPLETED: '등록 완료',
  REJECTED: '반려',
};

function formatRequestDate(v: unknown): string {
  if (v == null) return '';
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().toLocaleString('ko-KR');
    } catch {
      return '';
    }
  }
  return '';
}

type Props = {
  /** 버튼 행에 추가 스타일 (예: marginTop) */
  style?: StyleProp<ViewStyle>;
};

/**
 * 코스추가 요청하기 버튼 + 모달 (홈·코스 메뉴 공통)
 */
export function CourseAddRequestFooter({ style }: Props): React.JSX.Element {
  const { profile, user } = useAuth();
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reqGolfName, setReqGolfName] = useState('');
  const [reqRegion, setReqRegion] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState<CourseAddRequest[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);

  const loadMyRequests = useCallback(async () => {
    if (!user?.uid) {
      setMyRequests([]);
      return;
    }
    setLoadingMyRequests(true);
    try {
      const list = await fetchMyCourseAddRequests(user.uid);
      setMyRequests(list);
    } catch {
      setMyRequests([]);
    } finally {
      setLoadingMyRequests(false);
    }
  }, [user?.uid]);

  const openCourseRequestModal = useCallback(() => {
    if (!user?.uid) {
      Alert.alert('로그인 필요', '코스 추가 요청은 로그인 후 이용할 수 있습니다.');
      return;
    }
    setReqGolfName('');
    setReqRegion('');
    setReqDetails('');
    setRequestModalVisible(true);
    loadMyRequests();
  }, [user?.uid, loadMyRequests]);

  const handleSubmitCourseRequest = async () => {
    if (!user?.uid) return;
    const name = reqGolfName.trim();
    if (!name) {
      Alert.alert('입력 확인', '골프장(코스) 이름을 입력해 주세요.');
      return;
    }
    setSubmittingRequest(true);
    try {
      await submitCourseAddRequest({
        userId: user.uid,
        userEmail: user.email ?? '',
        userNickname:
          profile?.nickname ?? profile?.displayName ?? user?.displayName ?? '',
        golfCourseName: name,
        region: reqRegion.trim(),
        details: reqDetails.trim(),
      });
      Alert.alert('접수 완료', '요청이 접수되었습니다. 검토 후 앱에서 답변을 확인할 수 있습니다.');
      setReqGolfName('');
      setReqRegion('');
      setReqDetails('');
      await loadMyRequests();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '요청 전송에 실패했습니다.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.courseRequestShortcut, style]}
        onPress={openCourseRequestModal}
        activeOpacity={0.85}
      >
        <Ionicons name="map-outline" size={20} color="#0369a1" />
        <Text style={styles.courseRequestShortcutText}>코스추가 요청하기</Text>
        <Ionicons name="chevron-forward" size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>코스 추가 요청</Text>
              <TouchableOpacity
                onPress={() => setRequestModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              등록되지 않은 골프장이 있으면 아래에 남겨 주세요. 검토 후 코스에 반영되면 답변을 남겨 드립니다.
            </Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>골프장 이름 *</Text>
              <TextInput
                style={styles.input}
                value={reqGolfName}
                onChangeText={setReqGolfName}
                placeholder="예: OO 컨트리클럽"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>지역 (선택)</Text>
              <TextInput
                style={styles.input}
                value={reqRegion}
                onChangeText={setReqRegion}
                placeholder="예: 경기도 용인시"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>추가 설명 (선택)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={reqDetails}
                onChangeText={setReqDetails}
                placeholder="코스 수, 홈페이지 등 참고할 내용"
                placeholderTextColor="#94a3b8"
                multiline
              />
              <TouchableOpacity
                style={[styles.submitRequestBtn, submittingRequest && styles.submitRequestBtnDisabled]}
                onPress={handleSubmitCourseRequest}
                disabled={submittingRequest}
                activeOpacity={0.85}
              >
                {submittingRequest ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitRequestBtnText}>요청 보내기</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.myRequestsTitle}>내 요청 내역</Text>
              {loadingMyRequests ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color="#059669" />
              ) : myRequests.length === 0 ? (
                <Text style={styles.myRequestsEmpty}>아직 요청 내역이 없습니다.</Text>
              ) : (
                myRequests.map((r) => (
                  <View key={r.id} style={styles.requestItem}>
                    <View style={styles.requestItemHeader}>
                      <Text style={styles.requestItemName} numberOfLines={1}>
                        {r.golfCourseName}
                      </Text>
                      <Text style={styles.requestItemStatus}>
                        {REQUEST_STATUS_LABEL[r.status]}
                      </Text>
                    </View>
                    <Text style={styles.requestItemMeta}>
                      {formatRequestDate(r.createdAt) || '날짜 없음'}
                      {r.region ? ` · ${r.region}` : ''}
                    </Text>
                    {r.adminReply ? (
                      <View style={styles.adminReplyBox}>
                        <Text style={styles.adminReplyLabel}>관리자 답변</Text>
                        <Text style={styles.adminReplyText}>{r.adminReply}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  courseRequestShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseRequestShortcutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 480,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 14,
    backgroundColor: '#f8fafc',
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  submitRequestBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitRequestBtnDisabled: {
    opacity: 0.65,
  },
  submitRequestBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  myRequestsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  myRequestsEmpty: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
  },
  requestItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  requestItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  requestItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  requestItemStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  requestItemMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  adminReplyBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  adminReplyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 4,
  },
  adminReplyText: {
    fontSize: 13,
    color: '#064e3b',
    lineHeight: 19,
  },
});
