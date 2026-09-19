import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { Spacing, Typography } from '../theme';

interface FooterProps {
  style?: object;
}

export const Footer: React.FC<FooterProps> = ({ style }) => {
  const { theme } = useApp();
  const colors = theme.colors;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        A product of <Text style={[styles.brandText, { color: colors.primary }]}>Pra-Soft Technology</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  text: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  brandText: {
    fontWeight: '700',
  },
});
