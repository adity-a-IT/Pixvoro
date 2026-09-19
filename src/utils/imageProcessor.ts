import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageItem, PDFSettings, CompressionEstimate } from '../types';
import { PAGE_SIZES, COMPRESSION_PRESETS, TARGET_SIZE_BYTES } from '../constants/pdfPresets';

export interface ProcessedImageResult {
  uri: string;
  width: number;
  height: number;
  isPng: boolean;
  fileSizeBytes: number;
}

/**
 * Calculates optimal target resolution based on selected page size and DPI target.
 * Never upscales low-resolution images.
 */
export function calculateTargetResolution(
  imgWidth: number,
  imgHeight: number,
  settings: PDFSettings
): { width: number; height: number } {
  // Determine target DPI based on compression mode or quality slider
  let dpi = 150; // Default Balanced DPI

  if (settings.compressionMode === 'Custom') {
    // Quality slider 0 (100 DPI) to 100 (300 DPI)
    dpi = Math.round(100 + (settings.qualitySlider / 100) * 200);
  } else if (settings.compressionMode && COMPRESSION_PRESETS[settings.compressionMode]) {
    dpi = COMPRESSION_PRESETS[settings.compressionMode].targetDpi;
  }

  // Calculate page physical dimensions in inches (72 points = 1 inch)
  let pageWidthInches = 8.27; // Default A4
  let pageHeightInches = 11.69;

  if (settings.pageSize !== 'Original') {
    const preset = PAGE_SIZES[settings.pageSize] || PAGE_SIZES.A4;
    let isLandscape = false;
    if (settings.orientation === 'Landscape') {
      isLandscape = true;
    } else if (settings.orientation === 'Auto') {
      isLandscape = imgWidth > imgHeight;
    }

    const ptsW = isLandscape ? Math.max(preset.width, preset.height) : Math.min(preset.width, preset.height);
    const ptsH = isLandscape ? Math.min(preset.width, preset.height) : Math.max(preset.width, preset.height);
    pageWidthInches = ptsW / 72;
    pageHeightInches = ptsH / 72;
  } else {
    // Original dimensions: calculate effective inches assuming 150 DPI baseline
    pageWidthInches = imgWidth / 150;
    pageHeightInches = imgHeight / 150;
  }

  const maxTargetWidth = Math.round(pageWidthInches * dpi);
  const maxTargetHeight = Math.round(pageHeightInches * dpi);
  const maxDim = Math.max(maxTargetWidth, maxTargetHeight);

  const curMax = Math.max(imgWidth, imgHeight);

  // CRITICAL REQUIREMENT: Never upscale low-resolution images!
  if (curMax <= maxDim) {
    return { width: imgWidth, height: imgHeight };
  }

  // Downscale proportionally
  if (imgWidth >= imgHeight) {
    const newHeight = Math.round((imgHeight * maxDim) / imgWidth);
    return { width: maxDim, height: newHeight };
  } else {
    const newWidth = Math.round((imgWidth * maxDim) / imgHeight);
    return { width: newWidth, height: maxDim };
  }
}

/**
 * Calculates JPEG quality multiplier based on compression settings.
 */
export function getJpegQualityTarget(settings: PDFSettings): number {
  if (settings.compressionMode === 'Custom') {
    // Quality slider 0 (0.50) to 100 (0.95)
    return parseFloat((0.50 + (settings.qualitySlider / 100) * 0.45).toFixed(2));
  }
  if (settings.compressionMode && COMPRESSION_PRESETS[settings.compressionMode]) {
    return COMPRESSION_PRESETS[settings.compressionMode].jpegQuality;
  }
  return 0.75; // Balanced default
}

/**
 * Pre-estimates original vs compressed PDF file sizes.
 */
export async function estimateCompression(
  images: ImageItem[],
  settings: PDFSettings
): Promise<CompressionEstimate> {
  let originalTotalBytes = 0;

  for (const item of images) {
    if (item.fileSize) {
      originalTotalBytes += item.fileSize;
    } else {
      // Estimate based on dimensions if file size not populated
      originalTotalBytes += Math.round(item.width * item.height * 0.4);
    }
  }

  const quality = getJpegQualityTarget(settings);
  const dpi = settings.compressionMode === 'Custom'
    ? Math.round(100 + (settings.qualitySlider / 100) * 200)
    : COMPRESSION_PRESETS[settings.compressionMode]?.targetDpi || 150;

  // Compression factor based on quality, DPI, and document/grayscale mode
  let factor = 0.25; // Default Balanced ~75% reduction
  if (dpi <= 120) factor = 0.12;
  else if (dpi <= 160) factor = 0.22;
  else if (dpi <= 240) factor = 0.40;
  else factor = 0.65;

  if (settings.grayscale) factor *= 0.7;
  if (settings.documentMode) factor *= 0.8;

  const estimatedPdfBytes = Math.max(100 * 1024, Math.round(originalTotalBytes * factor));
  const estimatedReductionPercent = Math.max(
    5,
    Math.min(95, Math.round(((originalTotalBytes - estimatedPdfBytes) / Math.max(1, originalTotalBytes)) * 100))
  );

  return {
    originalTotalBytes,
    estimatedPdfBytes,
    estimatedReductionPercent,
  };
}

/**
 * Processes a single image sequentially (Rotation, Smart Downscaling, Document/Grayscale, Format selection).
 */
export async function processSingleImage(
  item: ImageItem,
  settings: PDFSettings,
  jpegQualityOverride?: number
): Promise<ProcessedImageResult> {
  const actions: ImageManipulator.Action[] = [];

  // 1. Rotation transform
  if (item.rotation && item.rotation !== 0) {
    actions.push({ rotate: item.rotation });
  }

  let curWidth = item.width;
  let curHeight = item.height;
  if (item.rotation === 90 || item.rotation === 270) {
    curWidth = item.height;
    curHeight = item.width;
  }

  // 2. Smart Resolution Downscaling
  const targetRes = calculateTargetResolution(curWidth, curHeight, settings);
  if (targetRes.width < curWidth || targetRes.height < curHeight) {
    actions.push({ resize: { width: targetRes.width, height: targetRes.height } });
    curWidth = targetRes.width;
    curHeight = targetRes.height;
  }

  // 3. Format selection (Intelligent JPEG conversion vs preserving transparent PNG)
  const isOriginalPng = item.uri.toLowerCase().endsWith('.png') || item.mimeType === 'image/png';
  let isPng = isOriginalPng;

  // If Smart Compression is ON, convert non-transparent PNG photos to compressed JPEG for significant size savings
  if (settings.smartCompression && isOriginalPng && !settings.documentMode) {
    isPng = false; // Convert photo PNG to JPEG
  }

  const jpegQuality = jpegQualityOverride ?? getJpegQualityTarget(settings);
  const saveFormat = isPng ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;

  // 4. Perform Image Manipulation
  const result = await ImageManipulator.manipulateAsync(item.uri, actions, {
    compress: jpegQuality,
    format: saveFormat,
  });

  // Read file info for size
  const info = await FileSystem.getInfoAsync(result.uri);
  const fileSizeBytes = info.exists ? (info.size ?? 0) : 0;

  return {
    uri: result.uri,
    width: result.width || curWidth,
    height: result.height || curHeight,
    isPng,
    fileSizeBytes,
  };
}

/**
 * Safely cleans up temporary intermediate files.
 */
export async function cleanupTempFiles(fileUris: string[]): Promise<void> {
  for (const uri of fileUris) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {}
  }
}
