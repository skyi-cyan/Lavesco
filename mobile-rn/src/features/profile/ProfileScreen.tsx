import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../core/auth/AuthContext';
import type { ProfileStackParamList } from '../../app/ProfileStack';

type ProfileScreenNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

type Props = {
  navigation: ProfileScreenNav;
};

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const { user, profile, signOut } = useAuth();

  const displayName =
    profile?.nickname ?? profile?.displayName ?? profile?.email ?? user?.email ?? '사용자';

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleProfileEdit = () => {
    navigation.navigate('ProfileEdit');
  };

  const handleNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 프로필 요약 */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.avatarWrapper}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color="#999" />
              </View>
            )}
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryName}>{displayName}</Text>
            {user?.email ? (
              <Text style={styles.summaryEmail} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
            {profile?.handicap != null ? (
              <Text style={styles.summaryMeta}>핸디캡 {profile.handicap}</Text>
            ) : null}
            {profile?.address ? (
              <Text style={styles.summarySub} numberOfLines={2}>
                {profile.address}
              </Text>
            ) : null}
            {profile?.dateOfBirth ? (
              <Text style={styles.summarySub}>생년월일 {profile.dateOfBirth}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* 메뉴: 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleProfileEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>프로필 수정</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={handleNotificationSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>알림 설정</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 메뉴: 계정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabelDanger}>로그아웃</Text>
            <Ionicons name="chevron-forward" size={20} color="#c00" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: { flex: 1 },
  summaryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  summaryEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  summaryMeta: {
    fontSize: 13,
    color: '#0a0',
    fontWeight: '500',
  },
  summarySub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowBorder: {
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuLabel: {
    fontSize: 16,
    color: '#111',
  },
  menuLabelDanger: {
    fontSize: 16,
    color: '#c00',
    fontWeight: '500',
  },
});
