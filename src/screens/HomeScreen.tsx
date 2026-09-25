import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';

import * as DocumentPicker from 'expo-document-picker';

import { RootStackParamList, ImageItem, RecentPDF } from '../types';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { RecentPdfCard } from '../components/RecentPdfCard';
import { EmptyState } from '../components/EmptyState';
import { ProgressModal } from '../components/ProgressModal';
import { Footer } from '../components/Footer';
import { pickAndCompressExistingPdf } from '../services/pdfCompressorService';
import { ensureLocalPdfUri } from '../utils/platformHelper';
import { Spacing, BorderRadius } from '../theme';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme, recentPdfs, refreshRecentPdfs, deletePdf, renamePdf } = useApp();
  const colors = theme.colors;
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Compress PDF Progress Modal State
  const [isCompressingPdf, setIsCompressingPdf] = useState(false);
  const [compressMsg, setCompressMsg] = useState('Compressing PDF...');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRecentPdfs();
    setRefreshing(false);
  }, [refreshRecentPdfs]);

  // Image Picker Logic
  const handlePickImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to select images for PDF creation.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: 0,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const items: ImageItem[] = result.assets.map((asset, i) => ({
          id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          uri: asset.uri,
          width: asset.width || 1000,
          height: asset.height || 1000,
          rotation: 0,
          filename: asset.fileName || `image_${i + 1}`,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
        }));

        navigation.navigate('ImageOrganizer', { selectedImages: items });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Image Selection Error', 'Unable to pick images. Please try again.');
    }
  };

  // Take Photo with Camera Action
  const handleTakeCameraPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to capture document photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const item: ImageItem = {
          id: `img_cam_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          uri: asset.uri,
          width: asset.width || 1000,
          height: asset.height || 1000,
          rotation: 0,
          filename: asset.fileName || `camera_photo_1`,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
        };

        navigation.navigate('ImageOrganizer', { selectedImages: [item] });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Unable to capture photo. Please try again.');
    }
  };

  // Compress Existing PDF Action
  const handleCompressExistingPdf = async () => {
    try {
      setIsCompressingPdf(true);
      setCompressMsg('Selecting PDF document...');

      const result = await pickAndCompressExistingPdf((msg) => setCompressMsg(msg));
      setIsCompressingPdf(false);

      if (result) {
        await refreshRecentPdfs();
        navigation.navigate('PdfResult', { pdf: result.pdfRecord });
      }
    } catch (error: any) {
      setIsCompressingPdf(false);
      Alert.alert('Compression Error', error?.message || 'Failed to compress the PDF file.');
    }
  };

  // Pick external PDF for viewing in PDF Reader
  const handlePickPdfForViewing = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        const safeUri = await ensureLocalPdfUri(fileAsset.uri, fileAsset.name);
        navigation.navigate('PdfViewer', {
          pdfUri: safeUri,
          pdfName: fileAsset.name || 'Document.pdf',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to select PDF document.');
    }
  };

  // Pick external PDF for editing in PDF Content Editor
  const handlePickPdfForEditing = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        const safeUri = await ensureLocalPdfUri(fileAsset.uri, fileAsset.name);
        navigation.navigate('PdfEditor', {
          pdfUri: safeUri,
          pdfName: fileAsset.name || 'Document.pdf',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to select PDF document for editing.');
    }
  };

  // Open PDF in Built-in PDF Reader
  const handleOpenPdf = async (pdf: RecentPDF) => {
    try {
      try {
        const info = await FileSystem.getInfoAsync(pdf.uri);
        if (info.exists === false) {
          Alert.alert('File Not Found', 'The requested PDF file no longer exists on this device.');
          await refreshRecentPdfs();
          return;
        }
      } catch {
        // If getInfoAsync fails on non-standard URI, proceed to open
      }
      navigation.navigate('PdfViewer', { pdfUri: pdf.uri, pdfName: pdf.name });
    } catch (error) {
      Alert.alert('Error', 'Could not open PDF viewer.');
    }
  };

  // Edit PDF in PDF Content Editor
  const handleEditPdf = (pdf: RecentPDF) => {
    navigation.navigate('PdfEditor', { pdfUri: pdf.uri, pdfName: pdf.name });
  };

  // Share PDF via native share sheet
  const handleSharePdf = async (pdf: RecentPDF) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdf.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${pdf.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Share Unavailable', 'Sharing is not supported on this device.');
      }
    } catch (error) {
      console.error('Sharing error:', error);
    }
  };

  const handleDeletePdf = (id: string) => {
    Alert.alert(
      'Delete PDF',
      'Are you sure you want to remove this PDF from history and delete its file?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePdf(id, true) },
      ]
    );
  };

  const filteredPdfs = recentPdfs.filter((pdf) =>
    pdf.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        showLogo
        subtitle="Image to PDF, Reader & Editor"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={[styles.settingsBtn, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityLabel="App Settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Main Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="document-text-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                PDF Studio & Creator
              </Text>
              <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
                Convert images, view PDFs with built-in reader, and edit PDF pages & text easily.
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Button
              title="Scan with Camera"
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="camera-outline" size={22} color="#FFFFFF" />}
              onPress={handleTakeCameraPhoto}
              style={{ marginBottom: Spacing.sm + 2 }}
            />

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
                onPress={handlePickImages}
              >
                <View style={[styles.actionIconBadge, { backgroundColor: colors.card }]}>
                  <Ionicons name="images-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  Pick Images
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
                onPress={handlePickPdfForViewing}
              >
                <View style={[styles.actionIconBadge, { backgroundColor: colors.card }]}>
                  <Ionicons name="eye-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.actionCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  Read PDF
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={handlePickPdfForEditing}
              >
                <View style={[styles.actionIconBadge, { backgroundColor: colors.card }]}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.actionCardTitle, { color: colors.primary }]} numberOfLines={1}>
                  Edit PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature Highlight Badges */}
          <View style={[styles.featuresRow, { borderColor: colors.border }]}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📖</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>PDF Reader</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>✏️</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>PDF Editor</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🔒</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>100% Offline</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🚫</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>No Ads</Text>
            </View>
          </View>
        </View>

        {/* Recent PDFs Section */}
        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent PDFs</Text>
          {recentPdfs.length > 0 && (
            <Text style={[styles.countBadge, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
              {recentPdfs.length}
            </Text>
          )}
        </View>

        {recentPdfs.length > 0 && (
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search recent PDFs..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {filteredPdfs.length > 0 ? (
          filteredPdfs.map((pdf) => (
            <RecentPdfCard
              key={pdf.id}
              item={pdf}
              onOpen={handleOpenPdf}
              onEdit={handleEditPdf}
              onShare={handleSharePdf}
              onDelete={handleDeletePdf}
              onRename={renamePdf}
            />
          ))
        ) : recentPdfs.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No PDFs Created Yet"
            description="Tap 'Create PDF' or 'Read PDF' to view, edit, or create your first document."
            actionTitle="Create PDF"
            onAction={handlePickImages}
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title="No Matching PDFs"
            description={`No document matched "${searchQuery}".`}
          />
        )}


        {/* Footer Branding */}
        <Footer />
      </ScrollView>

      {/* Compress PDF Progress Modal */}
      <ProgressModal
        visible={isCompressingPdf}
        current={1}
        total={2}
        message={compressMsg}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroActions: {
    marginBottom: Spacing.md,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionCardTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm + 4,
    borderTopWidth: 1,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  featureDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: Spacing.xs,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 42,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
});
