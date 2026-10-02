import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

export type ActionSheetItem = {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  /** 비활성 항목 아래에 사유 표시 */
  disabledReason?: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
};

/** Android Alert는 버튼이 3개로 제한되므로, 선택지가 많은 메뉴는 하단 시트로 표시 */
export function ActionSheet({ visible, title, items, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
          onPress={() => {}}
        >
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {items.map((item) => {
            const disabled = !!item.disabledReason;
            const color = disabled ? '#aaa' : item.destructive ? '#c62828' : '#111';
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.row}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                disabled={disabled}
                activeOpacity={0.7}
              >
                {item.icon ? (
                  <Ionicons name={item.icon} size={20} color={color} style={styles.icon} />
                ) : null}
                <View style={styles.rowText}>
                  <Text style={[styles.label, { color }]}>{item.label}</Text>
                  {item.disabledReason ? (
                    <Text style={styles.reason}>{item.disabledReason}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  icon: { marginRight: 12 },
  rowText: { flex: 1 },
  label: { fontSize: 16 },
  reason: { fontSize: 12, color: '#999', marginTop: 2 },
  cancel: {
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, color: '#666' },
});
