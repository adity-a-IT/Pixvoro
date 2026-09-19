import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';

import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { CompressionBar } from '../components/CompressionBar';
import { formatDate, formatBytes } from '../utils/helpers';
import { Spacing, BorderRadius } from '../theme';

type PdfResultProps = NativeStackScreenProps<RootStackParamList, 'PdfResult'>;

export const PdfResultScreen: React.FC<PdfResultProps> = ({ navigation, route }) => {
  const { theme } = useApp();
  const colors = theme.colors;
  const pdf = route.params.pdf;

  const handleOpenPdf = async () => {
    try {
      const info = await FileSystem.getInfoAsync(pdf.uri);
      if (!info.exists) {
        Alert.alert('Error', 'The PDF file could not be found.');
        return;
      }

      const contentUri = await FileSystem.getContentUriAsync(pdf.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/pdf',
        flags: 1,
      });
    } catch (error) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdf.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Open ${pdf.name}`,
        });
      } else {
        Alert.alert('Error', 'No PDF viewer application is available on this device.');
      }
    }
  };

  const handleSharePdf = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdf.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${pdf.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Share Unavailable', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCreateAnother = () => {
    navigation.navigate('Home');
  };

  const origBytes = pdf.originalSizeBytes ?? pdf.fileSize;
  const savedBytes = pdf.savedBytes ?? 0;
  const ratio = pdf.compressionRatio ?? 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Celebration Header */}
        <View style={styles.headerWrap}>
          <View style={[styles.successBadge, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            PDF Created Successfully
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Your document has been optimized and saved locally on your device.
          </Text>
        </View>

        {/* Target Size Notice Banner if present */}
        {pdf.targetNotice && (
          <View style={[styles.noticeBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} style={{ marginRight: 8 }} />
            <Text style={[styles.noticeText, { color: colors.textPrimary }]}>{pdf.targetNotice}</Text>
          </View>
        )}

        {/* Compression Statistics & Visual Comparison Bar */}
        <CompressionBar
          originalBytes={origBytes}
          compressedBytes={pdf.fileSize}
          reductionRatio={ratio}
        />

        {/* Document Details Card */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.docHeader}>
            <View style={[styles.docIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="document-text" size={32} color={colors.primary} />
            </View>
            <View style={styles.docTextWrap}>
              <Text numberOfLines={2} style={[styles.docName, { color: colors.textPrimary }]}>
                {pdf.name}
              </Text>
              <Text style={[styles.docDate, { color: colors.textSecondary }]}>
                Created: {formatDate(pdf.createdAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.metaGrid, { borderColor: colors.border }]}>
            <View style={styles.metaCol}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>TOTAL PAGES</Text>
              <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{pdf.pageCount}</Text>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaCol}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>FINAL SIZE</Text>
              <Text style={[styles.metaValue, { color: colors.success }]}>
                {formatBytes(pdf.fileSize)}
              </Text>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaCol}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>REDUCTION</Text>
              <Text style={[styles.metaValue, { color: colors.primary }]}>{ratio}%</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Open PDF"
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="open-outline" size={20} color="#FFFFFF" />}
            onPress={handleOpenPdf}
            style={{ marginBottom: Spacing.sm }}
          />

          <Button
            title="Share PDF"
            variant="secondary"
            size="md"
            fullWidth
            icon={<Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />}
            onPress={handleSharePdf}
            style={{ marginBottom: Spacing.sm }}
          />

          <Button
            title="Create Another PDF"
            variant="outline"
            size="md"
            fullWidth
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
            onPress={handleCreateAnother}
            style={{ marginBottom: Spacing.sm }}
          />

          <Button
            title="Back to Home"
            variant="ghost"
            size="md"
            fullWidth
            icon={<Ionicons name="home-outline" size={18} color={colors.textSecondary} />}
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  headerWrap: {
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  noticeBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  docCard: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  docIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  docTextWrap: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  docDate: {
    fontSize: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  metaCol: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metaDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  actionsContainer: {
    width: '100%',
  },
});
