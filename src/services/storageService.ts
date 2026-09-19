import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { RecentPDF, AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS } from '../constants/pdfPresets';

const RECENT_PDFS_KEY = '@Pixvoro_recent_pdfs_v1';
const APP_SETTINGS_KEY = '@Pixvoro_app_settings_v1';

export const PDF_DIRECTORY = `${FileSystem.documentDirectory}generated_pdfs/`;

/**
 * Ensures that the destination directory exists on local storage.
 */
export async function ensurePdfDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PDF_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PDF_DIRECTORY, { intermediates: true });
  }
}

/**
 * Retrieves the recent PDFs list, filtering out missing physical files gracefully.
 */
export async function getRecentPdfs(): Promise<RecentPDF[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_PDFS_KEY);
    if (!raw) return [];
    const list: RecentPDF[] = JSON.parse(raw);

    // Verify physical file existence
    const verifiedList: RecentPDF[] = [];
    let updated = false;

    for (const item of list) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(item.uri);
        if (fileInfo.exists) {
          verifiedList.push({
            ...item,
            fileSize: fileInfo.size ?? item.fileSize,
          });
        } else {
          updated = true; // File no longer exists, filter out
        }
      } catch {
        updated = true;
      }
    }

    if (updated) {
      await AsyncStorage.setItem(RECENT_PDFS_KEY, JSON.stringify(verifiedList));
    }

    return verifiedList.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching recent PDFs:', error);
    return [];
  }
}

/**
 * Saves a newly generated PDF into recent history list.
 */
export async function saveRecentPdf(pdf: RecentPDF): Promise<void> {
  try {
    const current = await getRecentPdfs();
    // Prepend new PDF, remove duplicates by ID or URI
    const filtered = current.filter(item => item.id !== pdf.id && item.uri !== pdf.uri);
    const updated = [pdf, ...filtered];
    await AsyncStorage.setItem(RECENT_PDFS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent PDF:', error);
  }
}

/**
 * Renames an existing PDF entry in history.
 */
export async function renameRecentPdf(id: string, newName: string): Promise<RecentPDF | null> {
  try {
    const current = await getRecentPdfs();
    const index = current.findIndex(item => item.id === id);
    if (index === -1) return null;

    const item = current[index];
    const sanitizedName = newName.toLowerCase().endsWith('.pdf') ? newName : `${newName}.pdf`;
    const updatedItem: RecentPDF = { ...item, name: sanitizedName };
    
    current[index] = updatedItem;
    await AsyncStorage.setItem(RECENT_PDFS_KEY, JSON.stringify(current));
    return updatedItem;
  } catch (error) {
    console.error('Error renaming PDF:', error);
    return null;
  }
}

/**
 * Deletes a PDF entry from history and optionally removes physical file from disk.
 */
export async function deleteRecentPdf(id: string, deletePhysicalFile = true): Promise<void> {
  try {
    const current = await getRecentPdfs();
    const itemToDelete = current.find(item => item.id === id);

    if (itemToDelete && deletePhysicalFile) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(itemToDelete.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(itemToDelete.uri, { idempotent: true });
        }
      } catch (fileErr) {
        console.warn('Could not delete physical file:', fileErr);
      }
    }

    const updated = current.filter(item => item.id !== id);
    await AsyncStorage.setItem(RECENT_PDFS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting PDF:', error);
  }
}

/**
 * Clears history list.
 */
export async function clearRecentHistory(deletePhysicalFiles = false): Promise<void> {
  try {
    if (deletePhysicalFiles) {
      const current = await getRecentPdfs();
      for (const item of current) {
        try {
          await FileSystem.deleteAsync(item.uri, { idempotent: true });
        } catch {}
      }
    }
    await AsyncStorage.removeItem(RECENT_PDFS_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

/**
 * Calculates storage used by stored generated PDFs.
 */
export async function getStorageUsage(): Promise<{ fileCount: number; totalBytes: number }> {
  try {
    await ensurePdfDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(PDF_DIRECTORY);
    let totalBytes = 0;
    let fileCount = 0;

    for (const filename of files) {
      if (filename.endsWith('.pdf')) {
        const info = await FileSystem.getInfoAsync(`${PDF_DIRECTORY}${filename}`);
        if (info.exists) {
          totalBytes += info.size ?? 0;
          fileCount++;
        }
      }
    }
    return { fileCount, totalBytes };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { fileCount: 0, totalBytes: 0 };
  }
}

/**
 * Loads stored user application settings.
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * Saves user application settings.
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}
