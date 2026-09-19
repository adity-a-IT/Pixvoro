import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const isWeb = Platform.OS === 'web';

/**
 * Universal base64 reader that works on both Mobile (iOS/Android) and PC (Web browsers).
 */
export async function readUriAsBase64(uri: string): Promise<string> {
  if (isWeb) {
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      return parts[1] || '';
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1] || '';
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
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

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${filename}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
