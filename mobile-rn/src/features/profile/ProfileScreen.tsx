import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../core/auth/AuthContext';

export function ProfileScreen(): React.JSX.Element {
  const { user, profile, signOut } = useAuth();

  const displayName =
    profile?.nickname ?? profile?.displayName ?? profile?.email ?? user?.email ?? '사용자';

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>프로필</Text>
      <Text style={styles.email}>{displayName}</Text>
      {user?.email ? <Text style={styles.subtitle}>{user.email}</Text> : null}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c00',
    borderRadius: 12,
  },
  logoutText: {
    color: '#c00',
    fontSize: 16,
    fontWeight: '600',
  },
});
