import React from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useApp } from '../context/AppContext';
import { BorderRadius, Spacing } from '../theme';

interface ProgressModalProps {
  visible: boolean;
  current: number;
  total: number;
  message: string;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  visible,
  current,
  total,
  message,
}) => {
  const { theme } = useApp();
  const colors = theme.colors;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>Creating PDF...</Text>
          
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>{message}</Text>

          {/* Progress Bar */}
          <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: colors.primary, width: `${Math.min(100, Math.max(5, percentage))}%` },
              ]}
            />
          </View>

          <Text style={[styles.percentText, { color: colors.primary }]}>{percentage}%</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
});
