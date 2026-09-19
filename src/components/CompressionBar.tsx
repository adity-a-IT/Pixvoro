import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../utils/helpers';
import { BorderRadius, Spacing } from '../theme';

interface CompressionBarProps {
  originalBytes: number;
  compressedBytes: number;
  reductionRatio: number;
}

export const CompressionBar: React.FC<CompressionBarProps> = ({
  originalBytes,
  compressedBytes,
  reductionRatio,
}) => {
  const { theme } = useApp();
  const colors = theme.colors;

  const savedBytes = Math.max(0, originalBytes - compressedBytes);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Size Reduction</Text>
        <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.badgeText, { color: colors.success }]}>
            {reductionRatio > 0 ? `-${reductionRatio}% Saved` : 'Optimized'}
          </Text>
        </View>
      </View>

      {/* Comparison Visual Bar */}
      <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.success,
              width: `${Math.max(5, Math.min(100, Math.round((compressedBytes / Math.max(1, originalBytes)) * 100)))}%`,
            },
          ]}
        />
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Original Size</Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {formatBytes(originalBytes)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Compressed PDF</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {formatBytes(compressedBytes)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Space Saved</Text>
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {formatBytes(savedBytes)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  track: {
    width: '100%',
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
});
