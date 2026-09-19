import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

import { ImageItem, PDFSettings, RecentPDF } from '../types';
import { PAGE_SIZES, MARGINS, TARGET_SIZE_BYTES } from '../constants/pdfPresets';
import { ensurePdfDirectoryExists, PDF_DIRECTORY, saveRecentPdf } from './storageService';
import { sanitizeFilename, generateDefaultPdfName, formatBytes } from '../utils/helpers';
import { processSingleImage, cleanupTempFiles, ProcessedImageResult } from '../utils/imageProcessor';

export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

/**
 * Core Smart PDF Engine.
 * Optimizes image resolution, applies DPI targeting, handles sequential processing,
 * calculates target file size constraints, and generates efficient PDF documents offline.
 */
export async function generatePdfFromImages(
  images: ImageItem[],
  settings: PDFSettings,
  onProgress?: ProgressCallback
): Promise<RecentPDF> {
  if (!images || images.length === 0) {
    throw new Error('No images selected for PDF generation.');
  }

  // Calculate total original images file size in bytes
  let originalTotalBytes = 0;
  for (const img of images) {
    if (img.fileSize) {
      originalTotalBytes += img.fileSize;
    } else {
      originalTotalBytes += Math.round(img.width * img.height * 0.4);
    }
  }

  const tempFilesToCleanup: string[] = [];

  try {
    const totalSteps = images.length + 2;
    let step = 0;

    const updateProgress = (msg: string) => {
      step++;
      if (onProgress) {
        onProgress(Math.min(step, totalSteps), totalSteps, msg);
      }
    };

    updateProgress('Initializing Smart PDF engine...');

    // 1. Execute PDF generation pass
    let { pdfDoc, tempFiles } = await buildPdfDocumentPass(images, settings, updateProgress);
    tempFilesToCleanup.push(...tempFiles);

    updateProgress('Finalizing and compiling PDF...');
    let pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });

    // 2. Target File Size Optimization Pass if requested
    let targetNotice: string | undefined = undefined;

    if (settings.targetSize && settings.targetSize !== 'NoTarget') {
      const targetLimitBytes = TARGET_SIZE_BYTES[settings.targetSize];
      let currentSizeBytes = Math.round((pdfBase64.length * 3) / 4); // Approximate base64 byte length

      if (currentSizeBytes > targetLimitBytes) {
        updateProgress('Optimizing size to match target...');
        // Try secondary compression pass with aggressive JPEG compression (0.50 quality & 110 DPI target)
        const aggressiveSettings: PDFSettings = {
          ...settings,
          compressionMode: 'Small',
          qualitySlider: 20,
        };

        const secondPass = await buildPdfDocumentPass(images, aggressiveSettings, () => {});
        tempFilesToCleanup.push(...secondPass.tempFiles);

        const secondBase64 = await secondPass.pdfDoc.saveAsBase64({ dataUri: false });
        const secondSizeBytes = Math.round((secondBase64.length * 3) / 4);

        if (secondSizeBytes <= targetLimitBytes) {
          // Target achieved!
          pdfBase64 = secondBase64;
          currentSizeBytes = secondSizeBytes;
        } else {
          // If aggressive pass still exceeds target, choose best readable result and set user notice
          if (secondSizeBytes < currentSizeBytes) {
            pdfBase64 = secondBase64;
            currentSizeBytes = secondSizeBytes;
          }
          targetNotice = `Couldn't reach ${settings.targetSize.replace('MB', ' MB')} without significantly reducing quality. A ${formatBytes(currentSizeBytes)} PDF was created instead.`;
        }
      }
    }

    // 3. Write PDF to local storage
    await ensurePdfDirectoryExists();
    const finalName = settings.pdfName ? sanitizeFilename(settings.pdfName) : generateDefaultPdfName();
    const fileUri = `${PDF_DIRECTORY}${finalName}`;

    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const finalSizeBytes = fileInfo.exists ? (fileInfo.size ?? 0) : 0;

    // 4. Calculate exact Compression Statistics
    const origBytes = Math.max(originalTotalBytes, finalSizeBytes);
    const savedBytes = Math.max(0, origBytes - finalSizeBytes);
    const compressionRatio = parseFloat(
      (origBytes > 0 ? ((origBytes - finalSizeBytes) / origBytes) * 100 : 0).toFixed(1)
    );

    const pdfRecord: RecentPDF = {
      id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: finalName,
      uri: fileUri,
      createdAt: Date.now(),
      pageCount: images.length,
      fileSize: finalSizeBytes,
      originalSizeBytes: origBytes,
      savedBytes,
      compressionRatio,
      targetNotice,
    };

    // Store record in recent history
    await saveRecentPdf(pdfRecord);

    return pdfRecord;
  } finally {
    // ALWAYS clean up temporary intermediate image files
    await cleanupTempFiles(tempFilesToCleanup);
  }
}

/**
 * Builds a PDF document pass by processing images sequentially to avoid memory spikes.
 */
async function buildPdfDocumentPass(
  images: ImageItem[],
  settings: PDFSettings,
  updateProgress: (msg: string) => void
): Promise<{ pdfDoc: PDFDocument; tempFiles: string[] }> {
  const pdfDoc = await PDFDocument.create();
  const tempFiles: string[] = [];
  const marginPts = MARGINS[settings.margin] ?? 18;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    updateProgress(`Optimizing image ${i + 1} of ${images.length}...`);

    // Process image one-by-one
    const processed: ProcessedImageResult = await processSingleImage(item, settings);
    tempFiles.push(processed.uri);

    // Read processed image as base64
    const base64Data = await FileSystem.readAsStringAsync(processed.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const imageBytes = Buffer.from(base64Data, 'base64');

    let embeddedImage;
    if (processed.isPng) {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    }

    const imgWidth = processed.width;
    const imgHeight = processed.height;

    // Calculate Page Dimensions in PostScript Points
    let pageWidth: number;
    let pageHeight: number;

    if (settings.pageSize === 'Original') {
      pageWidth = imgWidth;
      pageHeight = imgHeight;
    } else {
      const preset = PAGE_SIZES[settings.pageSize] || PAGE_SIZES.A4;
      let isLandscape = false;
      if (settings.orientation === 'Landscape') {
        isLandscape = true;
      } else if (settings.orientation === 'Auto') {
        isLandscape = imgWidth > imgHeight;
      }

      pageWidth = isLandscape ? Math.max(preset.width, preset.height) : Math.min(preset.width, preset.height);
      pageHeight = isLandscape ? Math.min(preset.width, preset.height) : Math.max(preset.width, preset.height);
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const drawableWidth = Math.max(10, pageWidth - 2 * marginPts);
    const drawableHeight = Math.max(10, pageHeight - 2 * marginPts);

    let renderWidth = imgWidth;
    let renderHeight = imgHeight;

    if (settings.imageFit === 'Fit') {
      const scale = Math.min(drawableWidth / imgWidth, drawableHeight / imgHeight);
      renderWidth = imgWidth * scale;
      renderHeight = imgHeight * scale;
    } else if (settings.imageFit === 'Fill') {
      renderWidth = drawableWidth;
      renderHeight = drawableHeight;
    } else if (settings.imageFit === 'Original') {
      const scale = Math.min(1, drawableWidth / imgWidth, drawableHeight / imgHeight);
      renderWidth = imgWidth * scale;
      renderHeight = imgHeight * scale;
    }

    const x = marginPts + (drawableWidth - renderWidth) / 2;
    const y = marginPts + (drawableHeight - renderHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });
  }

  return { pdfDoc, tempFiles };
}
