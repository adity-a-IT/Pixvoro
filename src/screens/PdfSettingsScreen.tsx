import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  RootStackParamList,
  PageSize,
  Orientation,
  MarginOption,
  ImageFit,
  PDFQuality,
  CompressionMode,
  TargetSizeOption,
  PDFSettings,
  CompressionEstimate,
} from '../types';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { ProgressModal } from '../components/ProgressModal';
import { generatePdfFromImages } from '../services/pdfEngineService';
import { generateDefaultPdfName, sanitizeFilename, formatBytes } from '../utils/helpers';
import { estimateCompression } from '../utils/imageProcessor';
import { Spacing, BorderRadius } from '../theme';

type PdfSettingsProps = NativeStackScreenProps<RootStackParamList, 'PdfSettings'>;

export const PdfSettingsScreen: React.FC<PdfSettingsProps> = ({ navigation, route }) => {
  const { theme, settings: appSettings } = useApp();
  const colors = theme.colors;
  const images = route.params.images || [];

  // Form State initialized with app settings defaults
  const [pdfName, setPdfName] = useState(generateDefaultPdfName());
  const [pageSize, setPageSize] = useState<PageSize>(appSettings.defaultPageSize || 'A4');
  const [orientation, setOrientation] = useState<Orientation>(appSettings.defaultOrientation || 'Auto');
  const [margin, setMargin] = useState<MarginOption>(appSettings.defaultMargin || 'Small');
  const [imageFit, setImageFit] = useState<ImageFit>(appSettings.defaultImageFit || 'Fit');
  const [quality, setQuality] = useState<PDFQuality>(appSettings.defaultQuality || 'High');

  // Advanced Smart Compression Form State
  const [compressionMode, setCompressionMode] = useState<CompressionMode>(
    appSettings.defaultCompressionMode || 'Balanced'
  );
  const [smartCompression, setSmartCompression] = useState<boolean>(
    appSettings.defaultSmartCompression ?? true
  );
  const [targetSize, setTargetSize] = useState<TargetSizeOption>(
    appSettings.defaultTargetSize || 'NoTarget'
  );
  const [documentMode, setDocumentMode] = useState<boolean>(
    appSettings.defaultDocumentMode ?? false
  );
  const [grayscale, setGrayscale] = useState<boolean>(
    appSettings.defaultGrayscale ?? false
  );
  const [blackAndWhite, setBlackAndWhite] = useState<boolean>(false);
  const [qualitySlider, setQualitySlider] = useState<number>(50); // 0 = Small, 50 = Balanced, 100 = Max

  // Compression Estimate State
  const [estimate, setEstimate] = useState<CompressionEstimate | null>(null);

  // Generation Progress Overlay State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(images.length + 2);
  const [progressMessage, setProgressMessage] = useState('Initializing Smart Engine...');

  // Update live estimate whenever compression settings change
  useEffect(() => {
    async function updateEstimate() {
      const currentSettings: PDFSettings = {
        pdfName,
        pageSize,
        orientation,
        margin,
        imageFit,
        quality,
        compressionMode,
        smartCompression,
        targetSize,
        documentMode,
        grayscale,
        blackAndWhite,
        qualitySlider,
      };
      const est = await estimateCompression(images, currentSettings);
      setEstimate(est);
    }
    updateEstimate();
  }, [
    images,
    pageSize,
    orientation,
    compressionMode,
    smartCompression,
    targetSize,
    documentMode,
    grayscale,
    qualitySlider,
  ]);

  const handleResetName = () => {
    setPdfName(generateDefaultPdfName());
  };

  const handleGeneratePdf = async () => {
    if (!images || images.length === 0) {
      Alert.alert('No Images', 'Please select at least one image.');
      return;
    }

    const sanitized = pdfName ? sanitizeFilename(pdfName) : generateDefaultPdfName();

    const pdfSettings: PDFSettings = {
      pdfName: sanitized,
      pageSize,
      orientation,
      margin,
      imageFit,
      quality,
      compressionMode,
      smartCompression,
      targetSize,
      documentMode,
      grayscale,
      blackAndWhite,
      qualitySlider,
    };

    setIsGenerating(true);
    setProgressCurrent(0);
    setProgressTotal(images.length + 2);
    setProgressMessage('Optimizing images and compiling PDF...');

    try {
      const result = await generatePdfFromImages(images, pdfSettings, (curr, tot, msg) => {
        setProgressCurrent(curr);
        setProgressTotal(tot);
        setProgressMessage(msg);
      });

      setIsGenerating(false);
      navigation.navigate('PdfResult', { pdf: result });
    } catch (error: any) {
      setIsGenerating(false);
      console.error('PDF Generation failed:', error);
      Alert.alert(
        'PDF Generation Failed',
        error?.message || 'Unable to create the PDF. Please check storage space and try again.'
      );
    }
  };

  const renderOptionGroup = <T extends string>(
    label: string,
    options: { value: T; label: string; desc?: string; icon?: keyof typeof Ionicons.glyphMap }[],
    selectedValue: T,
    onSelect: (val: T) => void
  ) => (
    <View style={styles.optionSection}>
      <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.pillsRow}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.75}
              onPress={() => onSelect(opt.value)}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={styles.pillIcon}
                />
              )}
              <View>
                <Text
                  style={[
                    styles.pillText,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    isSelected ? { fontWeight: '700' } : {},
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.desc && (
                  <Text
                    style={[
                      styles.pillDesc,
                      { color: isSelected ? 'rgba(255, 255, 255, 0.85)' : colors.textSecondary },
                    ]}
                  >
                    {opt.desc}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="PDF Settings"
        subtitle={`Configuring ${images.length} ${images.length === 1 ? 'page' : 'pages'}`}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* PDF Name Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>PDF File Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.filenameInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              value={pdfName}
              onChangeText={setPdfName}
              placeholder="Pixvoro_document.pdf"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              onPress={handleResetName}
              style={[styles.resetBtn, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityLabel="Reset filename"
            >
              <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Compression Estimate Preview Badge */}
        {estimate && (
          <View
            style={[
              styles.previewBadgeCard,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <View style={styles.previewHeaderRow}>
              <Ionicons name="analytics-outline" size={20} color={colors.primary} />
              <Text style={[styles.previewTitle, { color: colors.primary }]}>
                Estimated PDF Optimization
              </Text>
            </View>
            <View style={styles.previewMetricsRow}>
              <View style={styles.previewMetricItem}>
                <Text style={[styles.previewMetricLabel, { color: colors.textSecondary }]}>
                  Original Images
                </Text>
                <Text style={[styles.previewMetricValue, { color: colors.textPrimary }]}>
                  {formatBytes(estimate.originalTotalBytes)}
                </Text>
              </View>

              <Ionicons name="arrow-forward" size={16} color={colors.primary} />

              <View style={styles.previewMetricItem}>
                <Text style={[styles.previewMetricLabel, { color: colors.textSecondary }]}>
                  Est. Compressed PDF
                </Text>
                <Text style={[styles.previewMetricValue, { color: colors.primary }]}>
                  ~{formatBytes(estimate.estimatedPdfBytes)}
                </Text>
              </View>

              <View style={[styles.estChip, { backgroundColor: colors.primary }]}>
                <Text style={styles.estChipText}>~{estimate.estimatedReductionPercent}% Smaller</Text>
              </View>
            </View>
          </View>
        )}

        {/* Smart Compression Preset Modes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderOptionGroup(
            'Smart Compression Mode',
            [
              { value: 'Small', label: 'Small Size', desc: 'Smallest practical file size' },
              { value: 'Balanced', label: 'Balanced (Default)', desc: 'Best balance between quality & size' },
              { value: 'High', label: 'High Quality', desc: 'Better quality, larger file' },
              { value: 'Maximum', label: 'Maximum Quality', desc: 'Preserve maximum image detail' },
            ],
            compressionMode,
            setCompressionMode
          )}
        </View>

        {/* Smart Toggles: Smart Compression, Document Mode, Grayscale */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Advanced Optimization Features
          </Text>

          {/* Smart Compression Toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Smart Compression</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                Automatically determines appropriate resolution and image format per photo.
              </Text>
            </View>
            <Switch
              value={smartCompression}
              onValueChange={setSmartCompression}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Target PDF Size */}
          <View style={styles.optionSection}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontSize: 13, marginTop: Spacing.sm }]}>
              Target PDF Size
            </Text>
            <View style={styles.pillsRow}>
              {[
                { value: 'NoTarget', label: 'No target' },
                { value: '1MB', label: 'Under 1 MB' },
                { value: '2MB', label: 'Under 2 MB' },
                { value: '5MB', label: 'Under 5 MB' },
                { value: '10MB', label: 'Under 10 MB' },
              ].map((opt) => {
                const isSelected = targetSize === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTargetSize(opt.value as TargetSizeOption)}
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

          {/* Document Mode Toggle */}
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.sm }]}>
            <View style={styles.switchTextWrap}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Document Mode</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                Optimizes contrast and text sharpness specifically for scanned paperwork.
              </Text>
            </View>
            <Switch
              value={documentMode}
              onValueChange={setDocumentMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Grayscale Toggle */}
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.sm }]}>
            <View style={styles.switchTextWrap}>
              <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Grayscale</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                Converts photos to black-and-white to cut PDF file size dramatically.
              </Text>
            </View>
            <Switch
              value={grayscale}
              onValueChange={setGrayscale}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Quality vs Size Step Selector */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Quality vs Size Adjustment
          </Text>
          <View style={styles.sliderRow}>
            {[
              { val: 10, label: 'Smallest' },
              { val: 35, label: 'Compact' },
              { val: 50, label: 'Balanced' },
              { val: 75, label: 'High' },
              { val: 95, label: 'Max Quality' },
            ].map((step) => {
              const isSelected = qualitySlider === step.val;
              return (
                <TouchableOpacity
                  key={step.val}
                  onPress={() => {
                    setQualitySlider(step.val);
                    setCompressionMode('Custom');
                  }}
                  style={[
                    styles.sliderStepPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.sliderStepText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                    {step.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.sliderHint, { color: colors.textSecondary }]}>
            Higher quality will increase visual detail but result in a larger PDF file.
          </Text>
        </View>

        {/* Standard Options: Page Size */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderOptionGroup(
            'Page Size',
            [
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'Letter' },
              { value: 'Legal', label: 'Legal' },
              { value: 'Original', label: 'Original' },
            ],
            pageSize,
            setPageSize
          )}
        </View>

        {/* Standard Options: Orientation */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderOptionGroup(
            'Orientation',
            [
              { value: 'Auto', label: 'Auto' },
              { value: 'Portrait', label: 'Portrait', icon: 'phone-portrait-outline' },
              { value: 'Landscape', label: 'Landscape', icon: 'phone-landscape-outline' },
            ],
            orientation,
            setOrientation
          )}
        </View>

        {/* Standard Options: Margins & Fit */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderOptionGroup(
            'Page Margins',
            [
              { value: 'None', label: 'None' },
              { value: 'Small', label: 'Small' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Large', label: 'Large' },
            ],
            margin,
            setMargin
          )}

          <View style={{ marginTop: Spacing.md }}>
            {renderOptionGroup(
              'Image Fit Mode',
              [
                { value: 'Fit', label: 'Fit to Page' },
                { value: 'Fill', label: 'Fill Page' },
                { value: 'Original', label: 'Original Ratio' },
              ],
              imageFit,
              setImageFit
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Generate Action Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Button
          title="Generate Compressed PDF"
          variant="primary"
          size="lg"
          fullWidth
          icon={<Ionicons name="sparkles" size={20} color="#FFFFFF" />}
          onPress={handleGeneratePdf}
        />
      </View>

      {/* Generation Progress Indicator */}
      <ProgressModal
        visible={isGenerating}
        current={progressCurrent}
        total={progressTotal}
        message={progressMessage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  filenameInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  resetBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBadgeCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  previewMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  previewMetricItem: {
    alignItems: 'flex-start',
  },
  previewMetricLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  previewMetricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  estChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  estChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  optionSection: {
    marginVertical: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.xs + 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 4,
  },
  pillIcon: {
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
  },
  switchTextWrap: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginVertical: Spacing.xs,
  },
  sliderStepPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  sliderStepText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sliderHint: {
    fontSize: 11,
    marginTop: Spacing.xs,
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
