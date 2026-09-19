import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Spacing, Typography, BorderRadius } from '../theme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Pixvoro',
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  showLogo = false,
}) => {
  const { theme } = useApp();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {showLogo ? (
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="document-text" size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Pixvoro</Text>
              {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          </View>
        )}
      </View>

      {rightAction && <View style={styles.rightWrap}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm + 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm + 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleWrap: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
