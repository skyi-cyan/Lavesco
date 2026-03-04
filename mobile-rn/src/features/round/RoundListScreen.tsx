import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function RoundListScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>라운드</Text>
      <Text style={styles.subtitle}>라운드 목록이 여기에 표시됩니다.</Text>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
