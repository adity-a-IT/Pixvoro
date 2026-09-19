import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';
import { Buffer } from 'buffer';

import { RecentPDF } from '../types';
import { ensurePdfDirectoryExists, PDF_DIRECTORY, saveRecentPdf } from './storageService';
import { sanitizeFilename, formatBytes } from '../utils/helpers';

export interface CompressPdfResult {
  pdfRecord: RecentPDF;
  originalSizeBytes: number;
  newSizeBytes: number;
  savedBytes: number;
  compressionRatio: number;
}

/**
 * Allows the user to select an existing PDF file from device storage,
 * analyzes it, optimizes object streams, strips unnecessary metadata,
 * and produces a compressed PDF file on-device completely offline.
 */
export async function pickAndCompressExistingPdf(
  onProgress?: (msg: string) => void
): Promise<CompressPdfResult | null> {
  try {
    // 1. Launch Document Picker for PDFs
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const fileAsset = result.assets[0];
    const sourceUri = fileAsset.uri;
    const originalName = fileAsset.name || 'document.pdf';
    const originalSizeBytes = fileAsset.size ?? 0;

    if (onProgress) onProgress('Analyzing PDF file...');

    // Read existing PDF binary
    const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const pdfBytes = Buffer.from(base64Data, 'base64');

    if (onProgress) onProgress('Optimizing PDF structure & removing metadata...');

    // Load PDF using pdf-lib
    const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Create a clean, optimized copy
    const targetPdf = await PDFDocument.create();

    // Copy all pages
    const pageIndices = sourcePdf.getPageIndices();
    const copiedPages = await targetPdf.copyPages(sourcePdf, pageIndices);

    copiedPages.forEach((page) => {
      targetPdf.addPage(page);
    });

    if (onProgress) onProgress('Finalizing compressed PDF...');

    // Save with stream compression enabled
    const compressedBase64 = await targetPdf.saveAsBase64({ useObjectStreams: true });

    // Save to local directory
    await ensurePdfDirectoryExists();
    const rawName = `Compressed_${originalName.replace(/\.pdf$/i, '')}`;
    const finalName = sanitizeFilename(rawName);
    const destinationUri = `${PDF_DIRECTORY}${finalName}`;

    await FileSystem.writeAsStringAsync(destinationUri, compressedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const info = await FileSystem.getInfoAsync(destinationUri);
    const newSizeBytes = info.exists ? (info.size ?? 0) : Math.round((compressedBase64.length * 3) / 4);

    const origBytes = Math.max(originalSizeBytes, newSizeBytes);
    const savedBytes = Math.max(0, origBytes - newSizeBytes);
    const compressionRatio = parseFloat(
      (origBytes > 0 ? ((origBytes - newSizeBytes) / origBytes) * 100 : 0).toFixed(1)
    );

    const pdfRecord: RecentPDF = {
      id: `pdf_comp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: finalName,
      uri: destinationUri,
      createdAt: Date.now(),
      pageCount: pageIndices.length,
      fileSize: newSizeBytes,
      originalSizeBytes: origBytes,
      savedBytes,
      compressionRatio,
    };

    await saveRecentPdf(pdfRecord);

    return {
      pdfRecord,
      originalSizeBytes: origBytes,
      newSizeBytes,
      savedBytes,
      compressionRatio,
    };
  } catch (error) {
    console.error('Error compressing existing PDF:', error);
    throw new Error('Unable to compress the selected PDF file. Please ensure it is a valid PDF.');
  }
}
