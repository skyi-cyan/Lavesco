import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export function SplashScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⛳</Text>
      <Text style={styles.title}>Lavesco</Text>
      <ActivityIndicator size="large" color="#1a5f2a" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a5f2a' },
  loader: { marginTop: 32 },
});
