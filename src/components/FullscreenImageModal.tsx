import React from 'react';
import { Modal, View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageItem } from '../types';
import { Spacing, BorderRadius } from '../theme';

interface FullscreenImageModalProps {
  item: ImageItem | null;
  visible: boolean;
  onClose: () => void;
}

export const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({
  item,
  visible,
  onClose,
}) => {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={{ uri: item.uri }}
          style={[
            styles.image,
            { transform: [{ rotate: `${item.rotation}deg` }] },
          ]}
          resizeMode="contain"
        />

        <View style={styles.footerInfo}>
          <Text style={styles.infoText}>
            Resolution: {item.width} × {item.height} px
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.xl + 8,
    right: Spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '94%',
    height: '80%',
  },
  footerInfo: {
    position: 'absolute',
    bottom: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
