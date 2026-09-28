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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import {
  fetchMyCourseAddRequests,
  submitCourseAddRequest,
  type CourseAddRequest,
} from '../../core/services/courseRequestService';
import { getDateLocale } from '../../i18n';

function formatRequestDate(v: unknown): string {
  if (v == null) return '';
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().toLocaleString(getDateLocale());
    } catch {
      return '';
    }
  }
  return '';
}

type Props = {
  /** 버튼 행에 추가 스타일 (예: marginTop) */
  style?: StyleProp<ViewStyle>;
  /** bar: 가로형(코스 탭) / card: 홈 바로가기와 동일 카드형 */
  variant?: 'bar' | 'card';
};

/**
 * 코스추가 요청하기 버튼 + 모달 (홈·코스 메뉴 공통)
 */
export function CourseAddRequestFooter({ style, variant = 'bar' }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reqGolfName, setReqGolfName] = useState('');
  const [reqRegion, setReqRegion] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [myRequests, setMyRequests] = useState<CourseAddRequest[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);

  const loadMyRequests = useCallback(async () => {
    if (!user?.uid) {
      setMyRequests([]);
      return;
    }
    setLoadingMyRequests(true);
    setMyRequestsError(null);
    try {
      const list = await fetchMyCourseAddRequests(user.uid);
      setMyRequests(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('courseRequest.loadFailed');
      setMyRequestsError(msg);
      setMyRequests([]);
    } finally {
      setLoadingMyRequests(false);
    }
  }, [user?.uid, t]);

  const openCourseRequestModal = useCallback(() => {
    if (!user?.uid) {
      Alert.alert(t('roundCreate.loginRequiredTitle'), t('courseRequest.loginRequired'));
      return;
    }
    setReqGolfName('');
    setReqRegion('');
    setReqDetails('');
    setRequestModalVisible(true);
    loadMyRequests();
  }, [user?.uid, loadMyRequests, t]);

  const handleSubmitCourseRequest = async () => {
    if (!user?.uid) return;
    const name = reqGolfName.trim();
    if (!name) {
      Alert.alert(t('roundCreate.checkInput'), t('courseRequest.nameRequired'));
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
      Alert.alert(t('courseRequest.submittedTitle'), t('courseRequest.submittedMessage'));
      setReqGolfName('');
      setReqRegion('');
      setReqDetails('');
      // serverTimestamp(createdAt)가 바로 인덱스에 반영되지 않는 케이스를 대비해 1회 더 재조회
      await loadMyRequests();
      await new Promise((r) => setTimeout(r, 800));
      await loadMyRequests();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('courseRequest.submitFailed'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <TouchableOpacity
          style={[styles.cardBtn, style]}
          onPress={openCourseRequestModal}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIconWrap, styles.cardIconCourse]}>
            <Ionicons name="map" size={22} color="#fff" />
          </View>
          <Text style={styles.cardLabel} numberOfLines={2}>
            {t('courseRequest.cardLabel')}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.courseRequestShortcut, style]}
          onPress={openCourseRequestModal}
          activeOpacity={0.85}
        >
          <Ionicons name="map-outline" size={20} color="#0369a1" />
          <Text style={styles.courseRequestShortcutText}>{t('courseRequest.barLabel')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      )}

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
              <Text style={styles.modalTitle}>{t('courseRequest.modalTitle')}</Text>
              <TouchableOpacity
                onPress={() => setRequestModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>{t('courseRequest.modalDesc')}</Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>{t('courseRequest.nameLabel')}</Text>
              <TextInput
                style={styles.input}
                value={reqGolfName}
                onChangeText={setReqGolfName}
                placeholder={t('courseRequest.namePlaceholder')}
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>{t('courseRequest.regionLabel')}</Text>
              <TextInput
                style={styles.input}
                value={reqRegion}
                onChangeText={setReqRegion}
                placeholder={t('courseRequest.regionPlaceholder')}
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>{t('courseRequest.detailsLabel')}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={reqDetails}
                onChangeText={setReqDetails}
                placeholder={t('courseRequest.detailsPlaceholder')}
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
                  <Text style={styles.submitRequestBtnText}>{t('courseRequest.submit')}</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.myRequestsTitle}>{t('courseRequest.myRequests')}</Text>
              {loadingMyRequests ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color="#059669" />
              ) : myRequestsError ? (
                <Text style={styles.myRequestsError}>{myRequestsError}</Text>
              ) : myRequests.length === 0 ? (
                <Text style={styles.myRequestsEmpty}>{t('courseRequest.noRequests')}</Text>
              ) : (
                myRequests.map((r) => (
                  <View key={r.id} style={styles.requestItem}>
                    <View style={styles.requestItemHeader}>
                      <Text style={styles.requestItemName} numberOfLines={1}>
                        {r.golfCourseName}
                      </Text>
                      <Text style={styles.requestItemStatus}>
                        {t(`courseRequest.status.${r.status}`)}
                      </Text>
                    </View>
                    <Text style={styles.requestItemMeta}>
                      {formatRequestDate(r.createdAt) || t('courseRequest.noDate')}
                      {r.region ? ` · ${r.region}` : ''}
                    </Text>
                    {r.adminReply ? (
                      <View style={styles.adminReplyBox}>
                        <Text style={styles.adminReplyLabel}>{t('courseRequest.adminReply')}</Text>
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
  cardBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconCourse: {
    backgroundColor: '#0369a1',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 15,
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
    backgroundColor: '#f97316',
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
  myRequestsError: {
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: 8,
    marginTop: 6,
    lineHeight: 18,
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
