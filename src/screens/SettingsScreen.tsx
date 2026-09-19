import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  RootStackParamList,
  ThemeMode,
  PageSize,
  Orientation,
  MarginOption,
  PDFQuality,
  CompressionMode,
} from '../types';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { getStorageUsage } from '../services/storageService';
import { formatBytes } from '../utils/helpers';
import { Spacing, BorderRadius } from '../theme';

type SettingsProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<SettingsProps> = ({ navigation }) => {
  const { theme, settings, themeMode, updateSettings, clearHistory } = useApp();
  const colors = theme.colors;

  const [storageInfo, setStorageInfo] = useState<{ fileCount: number; totalBytes: number }>({
    fileCount: 0,
    totalBytes: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const stats = await getStorageUsage();
      setStorageInfo(stats);
    }
    loadStats();
  }, []);

  const handleClearHistoryPrompt = () => {
    Alert.alert(
      'Clear Recent History',
      'Choose whether to clear history only or also delete physical PDF files from your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep PDF Files',
          onPress: async () => {
            await clearHistory(false);
            const stats = await getStorageUsage();
            setStorageInfo(stats);
          },
        },
        {
          text: 'Delete PDF Files',
          style: 'destructive',
          onPress: async () => {
            await clearHistory(true);
            const stats = await getStorageUsage();
            setStorageInfo(stats);
          },
        },
      ]
    );
  };

  const renderSectionHeader = (title: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );

  const renderSelectRow = <T extends string>(
    label: string,
    options: { value: T; label: string }[],
    currentValue: T,
    onSelect: (val: T) => void
  ) => (
    <View style={[styles.settingRow, { borderColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.pillGroup}>
        {options.map((opt) => {
          const isSelected = currentValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  isSelected ? { fontWeight: '700' } : {},
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header showBack onBack={() => navigation.goBack()} title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance Settings */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderSectionHeader('Appearance', 'color-palette-outline')}
          {renderSelectRow<ThemeMode>(
            'Theme Mode',
            [
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ],
            themeMode,
            (theme) => updateSettings({ theme })
          )}
        </View>

        {/* Smart Compression & PDF Defaults */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderSectionHeader('Default PDF & Compression', 'options-outline')}

          {renderSelectRow<CompressionMode>(
            'Default Compression Mode',
            [
              { value: 'Small', label: 'Small Size' },
              { value: 'Balanced', label: 'Balanced' },
              { value: 'High', label: 'High Quality' },
              { value: 'Maximum', label: 'Max' },
            ],
            settings.defaultCompressionMode || 'Balanced',
            (defaultCompressionMode) => updateSettings({ defaultCompressionMode })
          )}

          {renderSelectRow<PageSize>(
            'Default Page Size',
            [
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'Letter' },
              { value: 'Legal', label: 'Legal' },
              { value: 'Original', label: 'Original' },
            ],
            settings.defaultPageSize,
            (defaultPageSize) => updateSettings({ defaultPageSize })
          )}

          {renderSelectRow<Orientation>(
            'Default Orientation',
            [
              { value: 'Auto', label: 'Auto' },
              { value: 'Portrait', label: 'Portrait' },
              { value: 'Landscape', label: 'Landscape' },
            ],
            settings.defaultOrientation,
            (defaultOrientation) => updateSettings({ defaultOrientation })
          )}

          {renderSelectRow<MarginOption>(
            'Default Margins',
            [
              { value: 'None', label: 'None' },
              { value: 'Small', label: 'Small' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Large', label: 'Large' },
            ],
            settings.defaultMargin,
            (defaultMargin) => updateSettings({ defaultMargin })
          )}
        </View>

        {/* Local Storage Stats */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderSectionHeader('Local Storage Manager', 'server-outline')}

          <View style={styles.storageStatsRow}>
            <View style={styles.storageCol}>
              <Text style={[styles.storageNum, { color: colors.textPrimary }]}>
                {storageInfo.fileCount}
              </Text>
              <Text style={[styles.storageSub, { color: colors.textSecondary }]}>PDF Documents</Text>
            </View>

            <View style={styles.storageCol}>
              <Text style={[styles.storageNum, { color: colors.textPrimary }]}>
                {formatBytes(storageInfo.totalBytes)}
              </Text>
              <Text style={[styles.storageSub, { color: colors.textSecondary }]}>Storage Used</Text>
            </View>
          </View>

          <Button
            title="Clear Recent History"
            variant="danger"
            size="sm"
            fullWidth
            icon={<Ionicons name="trash-bin-outline" size={16} color="#FFFFFF" />}
            onPress={handleClearHistoryPrompt}
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* Privacy Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderSectionHeader('Privacy & Security', 'shield-checkmark-outline')}
          <View style={[styles.privacyBox, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.privacyTitle, { color: colors.success }]}>🔒 100% Private & Offline</Text>
            <Text style={[styles.privacyDesc, { color: colors.textPrimary }]}>
              Your images and PDFs stay 100% on your device. Pixvoro processes all smart image compression
              and PDF building locally. Zero cloud uploads, zero remote analytics, and zero advertisements.
            </Text>
          </View>
        </View>

        {/* About App */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
          <View style={[styles.appBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="document-text" size={28} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>Pixvoro</Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>Image to PDF, simply.</Text>
          <Text style={[styles.appVersion, { color: colors.textMuted }]}>Version 1.1.0 (Smart Compression)</Text>
          <Footer style={{ marginTop: Spacing.sm }} />
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
    padding: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingRow: {
    marginBottom: Spacing.md,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
  },
  storageStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: Spacing.sm,
  },
  storageCol: {
    alignItems: 'center',
  },
  storageNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  storageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  privacyBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  appBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
  },
  appTagline: {
    fontSize: 13,
    marginTop: 2,
  },
  appVersion: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
});
