import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, ThemeTokens, TouchTarget } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderRadius: tokens.radius,
              borderWidth: tokens.borderWidth,
            },
            tokens.surfaceShadow,
          ]}>
          <View style={[styles.icon, { backgroundColor: palette.surfaceMuted }]}>
            <MaterialIcons color={palette.warning} name="warning-amber" size={26} />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.message, { color: palette.textMuted }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[
                styles.action,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.border, borderRadius: tokens.buttonRadius, borderWidth: tokens.buttonBorderWidth },
              ]}>
              <Text style={[styles.actionText, { color: palette.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[
                styles.action,
                { backgroundColor: palette.danger, borderColor: palette.danger, borderRadius: tokens.buttonRadius, borderWidth: tokens.buttonBorderWidth },
                tokens.buttonShadow,
              ]}>
              <Text style={[styles.actionText, { color: palette.tintContrast }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.58)', flex: 1, justifyContent: 'center', padding: Spacing.lg },
  dialog: { gap: Spacing.md, maxWidth: 420, padding: Spacing.lg, width: '100%' },
  icon: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: TouchTarget.minimum / 2, height: TouchTarget.minimum, justifyContent: 'center', width: TouchTarget.minimum },
  title: { fontSize: 22, fontWeight: '800' },
  message: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end', marginTop: Spacing.sm },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: TouchTarget.minimum, minWidth: 112, paddingHorizontal: Spacing.md },
  actionText: { fontSize: 15, fontWeight: '800' },
});
