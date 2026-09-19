import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  RootStackParamList,
  PdfPageItem,
  WatermarkOptions,
  PageNumberOptions,
  PdfMetadataOptions,
  WatermarkPosition,
} from '../types';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { ProgressModal } from '../components/ProgressModal';
import { loadPdfDetails, applyPdfEdits } from '../services/pdfEditService';
import { Spacing, BorderRadius } from '../theme';

type PdfEditorProps = NativeStackScreenProps<RootStackParamList, 'PdfEditor'>;

type EditorTab = 'pages' | 'watermark' | 'numbers' | 'metadata';

const WATERMARK_COLORS = [
  '#FF0000', // Red
  '#0052CC', // Blue
  '#00875A', // Green
  '#FF9900', // Orange
  '#6554C0', // Purple
  '#000000', // Black
];

export const PdfEditorScreen: React.FC<PdfEditorProps> = ({ route, navigation }) => {
  const { pdfUri, pdfName } = route.params;
  const { theme, refreshRecentPdfs } = useApp();
  const colors = theme.colors;

  const [activeTab, setActiveTab] = useState<EditorTab>('pages');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgressMsg, setSaveProgressMsg] = useState('Saving edited PDF...');

  // Editor State
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  
  // Watermark State
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkFontSize, setWatermarkFontSize] = useState(36);
  const [watermarkColor, setWatermarkColor] = useState('#FF0000');
  const [watermarkPos, setWatermarkPos] = useState<WatermarkPosition>('Diagonal');
  const [watermarkPages, setWatermarkPages] = useState<'all' | 'first' | 'last'>('all');

  // Page Numbers State
  const [pageNumbersEnabled, setPageNumbersEnabled] = useState(false);
  const [pageNumberPos, setPageNumberPos] = useState<'Header' | 'Footer'>('Footer');
  const [pageNumberFormat, setPageNumberFormat] = useState<'number' | 'pageOfTotal'>('pageOfTotal');

  // Metadata State
  const [docTitle, setDocTitle] = useState('');
  const [docAuthor, setDocAuthor] = useState('');
  const [docSubject, setDocSubject] = useState('');

  useEffect(() => {
    fetchPdfDetails();
  }, [pdfUri]);

  const fetchPdfDetails = async () => {
    try {
      setLoading(true);
      const details = await loadPdfDetails(pdfUri, pdfName);
      setPages(details.pages);
      setDocTitle(details.title || '');
      setDocAuthor(details.author || '');
      setDocSubject(details.subject || '');
    } catch (err) {
      console.error('Failed to load PDF details:', err);
      Alert.alert('Error', 'Could not read PDF structure for editing.');
    } finally {
      setLoading(false);
    }
  };

  // --- Page Operations ---
  const handleRotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const newPages = [...prev];
      const temp = newPages[index];
      newPages[index] = newPages[targetIndex];
      newPages[targetIndex] = temp;
      return newPages;
    });
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      Alert.alert('Action Disabled', 'PDF must contain at least 1 page.');
      return;
    }
    Alert.alert('Delete Page', `Are you sure you want to remove page ${index + 1}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setPages((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const handleDuplicatePage = (index: number) => {
    setPages((prev) => {
      const newPages = [...prev];
      const pageToDup = { ...newPages[index] };
      newPages.splice(index + 1, 0, pageToDup);
      return newPages;
    });
  };

  // --- Save Edited PDF ---
  const handleSaveEdits = async () => {
    if (pages.length === 0) {
      Alert.alert('Error', 'Cannot save an empty PDF.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveProgressMsg('Applying page transformations & overlays...');

      const watermarkOpts: WatermarkOptions | undefined = watermarkText.trim()
        ? {
            text: watermarkText.trim(),
            opacity: watermarkOpacity,
            fontSize: watermarkFontSize,
            colorHex: watermarkColor,
            position: watermarkPos,
            targetPages: watermarkPages,
          }
        : undefined;

      const pageNumOpts: PageNumberOptions = {
        enabled: pageNumbersEnabled,
        position: pageNumberPos,
        format: pageNumberFormat,
        fontSize: 10,
      };

      const metaOpts: PdfMetadataOptions = {
        title: docTitle.trim(),
        author: docAuthor.trim(),
        subject: docSubject.trim(),
      };

      const result = await applyPdfEdits(
        pdfUri,
        pdfName,
        pages,
        watermarkOpts,
        pageNumOpts,
        metaOpts
      );

      setIsSaving(false);
      await refreshRecentPdfs();

      Alert.alert('Success', 'PDF edits saved successfully!', [
        {
          text: 'Open PDF',
          onPress: () => {
            navigation.replace('PdfResult', { pdf: result });
          },
        },
      ]);
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Save Failed', err?.message || 'Failed to save PDF modifications.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title="PDF Content Editor"
        subtitle={`${pages.length} Pages • ${pdfName}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleSaveEdits}
            style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            <Text style={styles.saveHeaderBtnText}>Save</Text>
          </TouchableOpacity>
        }
      />

      {/* Editor Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('pages')}
          style={[styles.tabItem, activeTab === 'pages' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Ionicons
            name="layers-outline"
            size={18}
            color={activeTab === 'pages' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'pages' ? colors.primary : colors.textMuted },
            ]}
          >
            Pages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('watermark')}
          style={[styles.tabItem, activeTab === 'watermark' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Ionicons
            name="text-outline"
            size={18}
            color={activeTab === 'watermark' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'watermark' ? colors.primary : colors.textMuted },
            ]}
          >
            Watermark
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('numbers')}
          style={[styles.tabItem, activeTab === 'numbers' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeTab === 'numbers' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'numbers' ? colors.primary : colors.textMuted },
            ]}
          >
            Numbers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('metadata')}
          style={[styles.tabItem, activeTab === 'metadata' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={activeTab === 'metadata' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'metadata' ? colors.primary : colors.textMuted },
            ]}
          >
            Info
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Analyzing PDF document...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* TAB 1: PAGES MANAGER */}
          {activeTab === 'pages' && (
            <ScrollView contentContainerStyle={styles.scrollSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Page Organization</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Reorder, rotate, delete, or duplicate pages below.
                </Text>
              </View>

              {pages.map((item, index) => (
                <View
                  key={`page_${index}_${item.index}`}
                  style={[styles.pageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.pageBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.pageBadgeText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>

                  <View style={styles.pageDetails}>
                    <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                      Original Page {item.index + 1}
                    </Text>
                    <Text style={[styles.pageMeta, { color: colors.textSecondary }]}>
                      {item.width} × {item.height} pt • Rotation: {item.rotation}°
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.pageActions}>
                    <TouchableOpacity
                      onPress={() => handleMovePage(index, 'up')}
                      disabled={index === 0}
                      style={[styles.actionBtn, index === 0 && styles.btnDisabled]}
                    >
                      <Ionicons name="arrow-up" size={16} color={index === 0 ? colors.textMuted : colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleMovePage(index, 'down')}
                      disabled={index === pages.length - 1}
                      style={[styles.actionBtn, index === pages.length - 1 && styles.btnDisabled]}
                    >
                      <Ionicons name="arrow-down" size={16} color={index === pages.length - 1 ? colors.textMuted : colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleRotatePage(index)} style={styles.actionBtn}>
                      <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDuplicatePage(index)} style={styles.actionBtn}>
                      <Ionicons name="copy-outline" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDeletePage(index)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* TAB 2: WATERMARK & TEXT */}
          {activeTab === 'watermark' && (
            <ScrollView contentContainerStyle={styles.scrollSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Text & Watermark</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Add custom text overlays or confidential watermarks across pages.
                </Text>
              </View>

              <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Watermark Text</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="e.g. CONFIDENTIAL / DRAFT"
                  placeholderTextColor={colors.textMuted}
                  value={watermarkText}
                  onChangeText={setWatermarkText}
                />

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>
                  Position
                </Text>
                <View style={styles.optionsRow}>
                  {(['Diagonal', 'Center', 'Top', 'Bottom'] as WatermarkPosition[]).map((pos) => (
                    <TouchableOpacity
                      key={pos}
                      onPress={() => setWatermarkPos(pos)}
                      style={[
                        styles.chipBtn,
                        { borderColor: watermarkPos === pos ? colors.primary : colors.border },
                        watermarkPos === pos && { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: watermarkPos === pos ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {pos}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>
                  Text Color
                </Text>
                <View style={styles.colorsRow}>
                  {WATERMARK_COLORS.map((hex) => (
                    <TouchableOpacity
                      key={hex}
                      onPress={() => setWatermarkColor(hex)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: hex },
                        watermarkColor === hex && styles.colorCircleSelected,
                      ]}
                    />
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>
                  Font Size ({watermarkFontSize} pt)
                </Text>
                <View style={styles.optionsRow}>
                  {[24, 36, 48, 64].map((sz) => (
                    <TouchableOpacity
                      key={sz}
                      onPress={() => setWatermarkFontSize(sz)}
                      style={[
                        styles.chipBtn,
                        { borderColor: watermarkFontSize === sz ? colors.primary : colors.border },
                        watermarkFontSize === sz && { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: watermarkFontSize === sz ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {sz} pt
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}

          {/* TAB 3: PAGE NUMBERS */}
          {activeTab === 'numbers' && (
            <ScrollView contentContainerStyle={styles.scrollSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Page Numbering</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Automatically embed headers or footers with page numbers.
                </Text>
              </View>

              <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setPageNumbersEnabled(!pageNumbersEnabled)}
                  style={styles.toggleRow}
                >
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Enable Page Numbers</Text>
                    <Text style={[styles.fieldDesc, { color: colors.textSecondary }]}>
                      Add subtle text numbering to all pages
                    </Text>
                  </View>
                  <Ionicons
                    name={pageNumbersEnabled ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={pageNumbersEnabled ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>

                {pageNumbersEnabled && (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>
                      Position
                    </Text>
                    <View style={styles.optionsRow}>
                      {(['Footer', 'Header'] as ('Footer' | 'Header')[]).map((pos) => (
                        <TouchableOpacity
                          key={pos}
                          onPress={() => setPageNumberPos(pos)}
                          style={[
                            styles.chipBtn,
                            { borderColor: pageNumberPos === pos ? colors.primary : colors.border },
                            pageNumberPos === pos && { backgroundColor: colors.primaryLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: pageNumberPos === pos ? colors.primary : colors.textSecondary },
                            ]}
                          >
                            {pos}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>
                      Number Format
                    </Text>
                    <View style={styles.optionsRow}>
                      <TouchableOpacity
                        onPress={() => setPageNumberFormat('pageOfTotal')}
                        style={[
                          styles.chipBtn,
                          { borderColor: pageNumberFormat === 'pageOfTotal' ? colors.primary : colors.border },
                          pageNumberFormat === 'pageOfTotal' && { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: pageNumberFormat === 'pageOfTotal' ? colors.primary : colors.textSecondary }]}>
                          Page 1 of 10
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setPageNumberFormat('number')}
                        style={[
                          styles.chipBtn,
                          { borderColor: pageNumberFormat === 'number' ? colors.primary : colors.border },
                          pageNumberFormat === 'number' && { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: pageNumberFormat === 'number' ? colors.primary : colors.textSecondary }]}>
                          1
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          )}

          {/* TAB 4: METADATA */}
          {activeTab === 'metadata' && (
            <ScrollView contentContainerStyle={styles.scrollSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Document Metadata</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Edit document properties stored inside the PDF.
                </Text>
              </View>

              <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Title</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Document Title"
                  placeholderTextColor={colors.textMuted}
                  value={docTitle}
                  onChangeText={setDocTitle}
                />

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>Author</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Author Name"
                  placeholderTextColor={colors.textMuted}
                  value={docAuthor}
                  onChangeText={setDocAuthor}
                />

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: Spacing.md }]}>Subject</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Subject or Description"
                  placeholderTextColor={colors.textMuted}
                  value={docSubject}
                  onChangeText={setDocSubject}
                />
              </View>
            </ScrollView>
          )}

          {/* Footer Save Button */}
          <View style={[styles.bottomSaveBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Button
              title="Save & Export PDF"
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="checkmark-done" size={20} color="#FFFFFF" />}
              onPress={handleSaveEdits}
            />
          </View>
        </View>
      )}

      {/* Progress Modal */}
      <ProgressModal
        visible={isSaving}
        current={1}
        total={1}
        message={saveProgressMsg}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
  },
  scrollSection: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pageBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  pageBadgeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  pageDetails: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  pageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  inputCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldDesc: {
    fontSize: 11,
  },
  textInput: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chipBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSaveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
