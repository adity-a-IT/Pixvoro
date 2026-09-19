import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

import {
  PdfDocumentDetails,
  PdfPageItem,
  WatermarkOptions,
  PageNumberOptions,
  PdfMetadataOptions,
  RecentPDF,
} from '../types';
import { ensurePdfDirectoryExists, PDF_DIRECTORY, saveRecentPdf } from './storageService';
import { sanitizeFilename, formatBytes } from '../utils/helpers';
import { readUriAsBase64, isWeb, saveOrDownloadPdf } from '../utils/platformHelper';

/**
 * Converts a Hex color code (#RRGGBB) into pdf-lib RGB normalized values [0..1].
 */
function hexToRgb(hex: string) {
  try {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return rgb(r, g, b);
  } catch {
    return rgb(0.2, 0.2, 0.2);
  }
}

/**
 * Reads a PDF file and loads structural information (pages, metadata, count).
 */
export async function loadPdfDetails(pdfUri: string, pdfName: string): Promise<PdfDocumentDetails> {
  const base64Data = await readUriAsBase64(pdfUri);

  const pdfBytes = Buffer.from(base64Data, 'base64');
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const count = pdfDoc.getPageCount();
  const pagesInfo: PdfPageItem[] = [];

  for (let i = 0; i < count; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const rot = page.getRotation().angle;

    pagesInfo.push({
      index: i,
      rotation: rot || 0,
      width: Math.round(width),
      height: Math.round(height),
    });
  }

  const fileInfo = await FileSystem.getInfoAsync(pdfUri);
  const fileSize = fileInfo.exists ? (fileInfo.size ?? 0) : 0;

  return {
    uri: pdfUri,
    name: pdfName,
    pageCount: count,
    fileSize,
    title: pdfDoc.getTitle() || '',
    author: pdfDoc.getAuthor() || '',
    subject: pdfDoc.getSubject() || '',
    keywords: pdfDoc.getKeywords() || '',
    pages: pagesInfo,
  };
}

/**
 * Applies page manipulation (reorder, rotate, delete, duplicate), watermark text overlays,
 * page numbers, and metadata updates to a PDF document, saving the result.
 */
export async function applyPdfEdits(
  pdfUri: string,
  originalName: string,
  pageItems: PdfPageItem[],
  watermark?: WatermarkOptions,
  pageNumbers?: PageNumberOptions,
  metadata?: PdfMetadataOptions
): Promise<RecentPDF> {
  if (!pageItems || pageItems.length === 0) {
    throw new Error('PDF must contain at least 1 page.');
  }

  const base64Data = await readUriAsBase64(pdfUri);

  const sourceBytes = Buffer.from(base64Data, 'base64');
  const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });

  // Create new document to assemble transformed pages
  const editedDoc = await PDFDocument.create();

  // Load standard Helvetica font for text overlays & page numbers
  const font = await editedDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await editedDoc.embedFont(StandardFonts.Helvetica);

  const totalNewPages = pageItems.length;

  for (let newIndex = 0; newIndex < totalNewPages; newIndex++) {
    const item = pageItems[newIndex];
    // Copy target page from source document
    const [copiedPage] = await editedDoc.copyPages(sourceDoc, [item.index]);
    
    // Apply rotation
    copiedPage.setRotation(degrees(item.rotation % 360));

    const page = editedDoc.addPage(copiedPage);
    const { width, height } = page.getSize();

    // 1. Apply Watermark / Text Overlay if enabled
    if (watermark && watermark.text && watermark.text.trim().length > 0) {
      const shouldApply =
        !watermark.targetPages ||
        watermark.targetPages === 'all' ||
        (watermark.targetPages === 'first' && newIndex === 0) ||
        (watermark.targetPages === 'last' && newIndex === totalNewPages - 1);

      if (shouldApply) {
        const text = watermark.text.trim();
        const fontSz = watermark.fontSize || 36;
        const color = hexToRgb(watermark.colorHex || '#FF0000');
        const opacity = watermark.opacity || 0.4;
        const textWidth = font.widthOfTextAtSize(text, fontSz);

        if (watermark.position === 'Diagonal') {
          page.drawText(text, {
            x: Math.max(10, (width - textWidth) / 2),
            y: height / 2,
            size: fontSz,
            font: font,
            color: color,
            opacity: opacity,
            rotate: degrees(45),
          });
        } else if (watermark.position === 'Top') {
          page.drawText(text, {
            x: Math.max(10, (width - textWidth) / 2),
            y: height - fontSz - 30,
            size: fontSz,
            font: font,
            color: color,
            opacity: opacity,
          });
        } else if (watermark.position === 'Bottom') {
          page.drawText(text, {
            x: Math.max(10, (width - textWidth) / 2),
            y: 40,
            size: fontSz,
            font: font,
            color: color,
            opacity: opacity,
          });
        } else {
          // Center position
          page.drawText(text, {
            x: Math.max(10, (width - textWidth) / 2),
            y: (height - fontSz) / 2,
            size: fontSz,
            font: font,
            color: color,
            opacity: opacity,
          });
        }
      }
    }

    // 2. Apply Header / Footer Page Numbers if enabled
    if (pageNumbers && pageNumbers.enabled) {
      const pageStr =
        pageNumbers.format === 'pageOfTotal'
          ? `Page ${newIndex + 1} of ${totalNewPages}`
          : `${newIndex + 1}`;

      const numFontSz = pageNumbers.fontSize || 10;
      const numWidth = regularFont.widthOfTextAtSize(pageStr, numFontSz);
      const posX = (width - numWidth) / 2;
      const posY = pageNumbers.position === 'Header' ? height - 20 : 15;

      page.drawText(pageStr, {
        x: posX,
        y: posY,
        size: numFontSz,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
        opacity: 0.85,
      });
    }
  }

  // 3. Apply Metadata Updates
  if (metadata) {
    if (metadata.title) editedDoc.setTitle(metadata.title);
    if (metadata.author) editedDoc.setAuthor(metadata.author);
    if (metadata.subject) editedDoc.setSubject(metadata.subject);
    if (metadata.keywords) editedDoc.setKeywords(metadata.keywords.split(','));
  }

  // Compile and Save Edited PDF
  const editedBase64 = await editedDoc.saveAsBase64({ dataUri: false });

  await ensurePdfDirectoryExists();
  const cleanBaseName = originalName.replace(/\.pdf$/i, '');
  const editedFileName = sanitizeFilename(`${cleanBaseName}_edited_${Date.now().toString().slice(-4)}.pdf`);
  const fileUri = isWeb ? `data:application/pdf;base64,${editedBase64}` : `${PDF_DIRECTORY}${editedFileName}`;

  if (isWeb) {
    await saveOrDownloadPdf(editedBase64, editedFileName);
  } else {
    await FileSystem.writeAsStringAsync(fileUri, editedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const finalSizeBytes = Math.round((editedBase64.length * 3) / 4);

  const pdfRecord: RecentPDF = {
    id: `pdf_edited_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: editedFileName,
    uri: fileUri,
    createdAt: Date.now(),
    pageCount: totalNewPages,
    fileSize: finalSizeBytes,
  };

  await saveRecentPdf(pdfRecord);
  return pdfRecord;
}

/**
 * Merges multiple PDF files into a single PDF document.
 */
export async function mergePdfFiles(fileUris: string[], outputName: string): Promise<RecentPDF> {
  if (!fileUris || fileUris.length < 2) {
    throw new Error('Select at least 2 PDF files to merge.');
  }

  const mergedDoc = await PDFDocument.create();
  let totalPageCount = 0;

  for (const uri of fileUris) {
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Buffer.from(base64Data, 'base64');
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    const indices = doc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(doc, indices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
    totalPageCount += indices.length;
  }

  const mergedBase64 = await mergedDoc.saveAsBase64({ dataUri: false });
  await ensurePdfDirectoryExists();

  const finalName = sanitizeFilename(outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`);
  const fileUri = `${PDF_DIRECTORY}${finalName}`;

  await FileSystem.writeAsStringAsync(fileUri, mergedBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const finalSizeBytes = fileInfo.exists ? (fileInfo.size ?? 0) : 0;

  const pdfRecord: RecentPDF = {
    id: `pdf_merged_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: finalName,
    uri: fileUri,
    createdAt: Date.now(),
    pageCount: totalPageCount,
    fileSize: finalSizeBytes,
  };

  await saveRecentPdf(pdfRecord);
  return pdfRecord;
}
