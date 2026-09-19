import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { BorderRadius, Spacing, Typography } from '../theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const { theme } = useApp();
  const colors = theme.colors;

  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
    };

    if (fullWidth) base.width = '100%';

    // Padding by size
    if (size === 'sm') {
      base.paddingVertical = Spacing.xs + 2;
      base.paddingHorizontal = Spacing.md;
    } else if (size === 'lg') {
      base.paddingVertical = Spacing.md + 2;
      base.paddingHorizontal = Spacing.xl;
    } else {
      base.paddingVertical = Spacing.sm + 4;
      base.paddingHorizontal = Spacing.lg;
    }

    // Colors by variant
    switch (variant) {
      case 'secondary':
        base.backgroundColor = colors.surfaceSecondary;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = colors.primary;
        break;
      case 'danger':
        base.backgroundColor = colors.danger;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'primary':
      default:
        base.backgroundColor = colors.primary;
        break;
    }

    if (disabled || loading) {
      base.opacity = 0.55;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let color = colors.card;

    if (variant === 'secondary') {
      color = colors.textPrimary;
    } else if (variant === 'outline' || variant === 'ghost') {
      color = colors.primary;
    } else if (variant === 'danger') {
      color = '#FFFFFF';
    }

    let fontSize = Typography.bodyMedium.fontSize;
    if (size === 'sm') fontSize = Typography.bodySmall.fontSize;
    if (size === 'lg') fontSize = Typography.bodyLarge.fontSize;

    return {
      color,
      fontSize,
      fontWeight: '600',
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <>{icon}</>}
          <Text style={[getTextStyle(), icon && iconPosition === 'left' ? { marginLeft: 8 } : {}, icon && iconPosition === 'right' ? { marginRight: 8 } : {}, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <>{icon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};
