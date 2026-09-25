import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';

export const isWeb = Platform.OS === 'web';

/**
 * Robust universal base64 reader that safely handles:
 * - data: URIs
 * - Web blobs
 * - Android content:// URIs (Downloads, Media, Google Drive, WhatsApp, SAF)
 * - Native file:// URIs
 */
export async function readUriAsBase64(uri: string): Promise<string> {
  if (!uri) return '';

  // 1. Data URI
  if (uri.startsWith('data:')) {
    const parts = uri.split(',');
    return parts[1] || '';
  }

  // 2. Web browser environment
  if (isWeb) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 3. Android content:// URIs:
  // Legacy FileSystem.readAsStringAsync fails on Android when host is not com.android.externalstorage.
  // We use the modern File class or React Native's fetch (ContentResolver) as primary mechanisms.
  if (uri.startsWith('content://')) {
    // Strategy A: New Expo 57 File class with ContentProvider support
    try {
      const file = new File(uri);
      const b64 = await file.base64();
      if (b64 && b64.length > 0) {
        return b64;
      }
    } catch {
      // Continue to Strategy B
    }

    // Strategy B: React Native fetch() which invokes Android ContentResolver
    try {
      const response = await fetch(uri);
      const arrayBuf = await response.arrayBuffer();
      const b64 = Buffer.from(arrayBuf).toString('base64');
      if (b64 && b64.length > 0) {
        return b64;
      }
    } catch {
      // Continue to Strategy C
    }

    // Strategy C: Legacy FileSystem readAsStringAsync
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // Continue to Strategy D
    }

    // Strategy D: FileReader fallback
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (finalErr) {
      throw new Error(`Failed to read content URI: ${finalErr}`);
    }
  }

  // 4. Standard file:// URIs
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    // Fallback to File class
    try {
      const file = new File(uri);
      return await file.base64();
    } catch {
      // Fallback to fetch
      const response = await fetch(uri);
      const arrayBuf = await response.arrayBuffer();
      return Buffer.from(arrayBuf).toString('base64');
    }
  }
}

/**
 * Ensures a URI is converted to an accessible local file:// URI in the app's cache directory.
 * This is crucial for Android content:// URIs returned by DocumentPicker.
 */
export async function ensureLocalPdfUri(uri: string, filename?: string): Promise<string> {
  if (isWeb || !uri) {
    return uri;
  }

  // Already a local file URI inside app's reach
  if (uri.startsWith('file://')) {
    return uri;
  }

  // If it's a content:// URI or external handle, copy to app's cache directory
  if (uri.startsWith('content://')) {
    try {
      const safeName = filename
        ? filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        : `imported_${Date.now()}.pdf`;
      const targetUri = `${FileSystem.cacheDirectory}${Date.now()}_${safeName}`;

      const base64Data = await readUriAsBase64(uri);
      if (base64Data) {
        await FileSystem.writeAsStringAsync(targetUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return targetUri;
      }
    } catch (err) {
      console.warn('ensureLocalPdfUri cache copy failed, falling back to original URI:', err);
    }
  }

  return uri;
}

/**
 * Universal file saver & downloader for both Mobile and PC browsers.
 */
export async function saveOrDownloadPdf(base64Data: string, filename: string): Promise<void> {
  if (isWeb) {
    try {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64Data}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Web download error:', e);
    }
    return;
  }
}

/**
 * Universal PDF Sharing helper for Mobile (Native share sheet) and PC (Trigger browser download).
 */
export async function shareOrDownloadPdf(pdfUri: string, filename: string): Promise<void> {
  if (isWeb) {
    try {
      const base64 = await readUriAsBase64(pdfUri);
      await saveOrDownloadPdf(base64, filename);
    } catch (err) {
      console.error('Web share/download error:', err);
    }
    return;
  }

  const safeUri = await ensureLocalPdfUri(pdfUri, filename);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(safeUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${filename}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
