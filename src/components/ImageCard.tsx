import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageItem } from '../types';
import { useApp } from '../context/AppContext';
import { BorderRadius, Spacing } from '../theme';

interface ImageCardProps {
  item: ImageItem;
  index: number;
  total: number;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onPreview: (item: ImageItem) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  index,
  total,
  onRotate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onPreview,
}) => {
  const { theme } = useApp();
  const colors = theme.colors;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Thumbnail Area */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPreview(item)}
        style={styles.thumbnailContainer}
      >
        <Image
          source={{ uri: item.uri }}
          style={[
            styles.thumbnail,
            { transform: [{ rotate: `${item.rotation}deg` }] },
          ]}
          resizeMode="cover"
        />
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>#{index + 1}</Text>
        </View>
        <View style={styles.previewHint}>
          <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Info & Action Controls */}
      <View style={styles.controlsRow}>
        <View style={styles.reorderBtns}>
          <TouchableOpacity
            disabled={index === 0}
            onPress={() => onMoveUp(index)}
            style={[
              styles.actionIconBtn,
              { backgroundColor: colors.surfaceSecondary },
              index === 0 ? { opacity: 0.3 } : {},
            ]}
          >
            <Ionicons name="chevron-up" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={index === total - 1}
            onPress={() => onMoveDown(index)}
            style={[
              styles.actionIconBtn,
              { backgroundColor: colors.surfaceSecondary },
              index === total - 1 ? { opacity: 0.3 } : {},
            ]}
          >
            <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => onRotate(item.id)}
          style={[styles.actionIconBtn, { backgroundColor: colors.primaryLight }]}
          accessibilityLabel="Rotate image 90 degrees"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={[styles.actionIconBtn, { backgroundColor: colors.dangerLight }]}
          accessibilityLabel="Delete image"
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnailContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  previewHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 3,
    borderRadius: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  reorderBtns: {
    flexDirection: 'row',
    gap: 4,
    marginRight: Spacing.xs,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
