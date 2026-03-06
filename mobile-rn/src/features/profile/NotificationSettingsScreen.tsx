import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function NotificationSettingsScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>알림 설정은 준비 중입니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
