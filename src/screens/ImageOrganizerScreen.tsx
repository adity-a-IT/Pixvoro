import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { RootStackParamList, ImageItem } from '../types';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { ImageCard } from '../components/ImageCard';
import { FullscreenImageModal } from '../components/FullscreenImageModal';
import { rotateAngle } from '../utils/helpers';
import { Spacing, BorderRadius } from '../theme';

type ImageOrganizerProps = NativeStackScreenProps<RootStackParamList, 'ImageOrganizer'>;

export const ImageOrganizerScreen: React.FC<ImageOrganizerProps> = ({ navigation, route }) => {
  const { theme } = useApp();
  const colors = theme.colors;

  const [images, setImages] = useState<ImageItem[]>(route.params.selectedImages || []);
  const [previewItem, setPreviewItem] = useState<ImageItem | null>(null);

  // Snap additional photo with Camera
  const handleSnapCameraPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to capture photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newItem: ImageItem = {
          id: `img_cam_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          uri: asset.uri,
          width: asset.width || 1000,
          height: asset.height || 1000,
          rotation: 0,
          filename: asset.fileName || `camera_photo_${images.length + 1}`,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
        };

        setImages((prev) => [...prev, newItem]);
      }
    } catch (error) {
      console.error('Error snapping camera photo:', error);
    }
  };

  // Add more images from library
  const handleAddMoreImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed to add more images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: ImageItem[] = result.assets.map((asset, i) => ({
          id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          uri: asset.uri,
          width: asset.width || 1000,
          height: asset.height || 1000,
          rotation: 0,
          filename: asset.fileName || `image_${images.length + i + 1}`,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
        }));

        setImages((prev) => [...prev, ...newItems]);
      }
    } catch (error) {
      console.error('Error adding images:', error);
    }
  };

  // Rotate an image by 90 degrees
  const handleRotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation: rotateAngle(item.rotation) } : item))
    );
  };

  // Delete an individual image
  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        // Return to Home if all images deleted
        navigation.navigate('Home');
      }
      return updated;
    });
  };

  // Reorder: Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  // Reorder: Move Down
  const handleMoveDown = (index: number) => {
    if (index >= images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleProceedToSettings = () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please add at least one image to create a PDF.');
      return;
    }
    navigation.navigate('PdfSettings', { images });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Organize Images"
        subtitle={`${images.length} ${images.length === 1 ? 'Image' : 'Images'} Selected`}
        rightAction={
          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
            <Button
              title="Camera"
              variant="secondary"
              size="sm"
              icon={<Ionicons name="camera-outline" size={16} color={colors.textPrimary} />}
              onPress={handleSnapCameraPhoto}
            />
            <Button
              title="Add"
              variant="ghost"
              size="sm"
              icon={<Ionicons name="add" size={18} color={colors.primary} />}
              onPress={handleAddMoreImages}
            />
          </View>
        }
      />

      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ImageCard
            item={item}
            index={index}
            total={images.length}
            onRotate={handleRotateImage}
            onDelete={handleDeleteImage}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onPreview={(selected) => setPreviewItem(selected)}
          />
        )}
      />

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <Button
          title={`Configure PDF (${images.length} ${images.length === 1 ? 'page' : 'pages'})`}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
          iconPosition="right"
          onPress={handleProceedToSettings}
        />
      </View>

      {/* Fullscreen Preview Modal */}
      <FullscreenImageModal
        item={previewItem}
        visible={previewItem !== null}
        onClose={() => setPreviewItem(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
