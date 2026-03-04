import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../core/auth/AuthContext';

export function HomeScreen(): React.JSX.Element {
  const { profile, user } = useAuth();
  const displayName =
    profile?.nickname ?? profile?.displayName ?? user?.email ?? '사용자';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⛳</Text>
      <Text style={styles.title}>홈 화면</Text>
      <Text style={styles.subtitle}>{displayName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a5f2a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
