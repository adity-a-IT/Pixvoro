import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { AppSettings, RecentPDF, ThemeMode } from '../types';
import { LightTheme, DarkTheme } from '../theme';
import { DEFAULT_APP_SETTINGS } from '../constants/pdfPresets';
import {
  loadSettings,
  saveSettings as persistSettings,
  getRecentPdfs,
  deleteRecentPdf as removeRecentPdf,
  renameRecentPdf as updateRecentPdfName,
  clearRecentHistory as purgeRecentHistory,
} from '../services/storageService';

interface AppContextType {
  settings: AppSettings;
  themeMode: ThemeMode;
  theme: typeof LightTheme;
  recentPdfs: RecentPDF[];
  isLoadingHistory: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  refreshRecentPdfs: () => Promise<void>;
  deletePdf: (id: string, deletePhysicalFile?: boolean) => Promise<void>;
  renamePdf: (id: string, newName: string) => Promise<RecentPDF | null>;
  clearHistory: (deletePhysicalFiles?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [recentPdfs, setRecentPdfs] = useState<RecentPDF[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Initialize Settings & Recent PDFs on launch
  useEffect(() => {
    async function init() {
      try {
        const loaded = await loadSettings();
        setSettings(loaded);
        const history = await getRecentPdfs();
        setRecentPdfs(history);
      } catch (err) {
        console.error('Failed to initialize app state:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    init();
  }, []);

  // Compute active theme
  const activeThemeMode = settings.theme || 'system';
  const isDark =
    activeThemeMode === 'dark' || (activeThemeMode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? DarkTheme : LightTheme;

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await persistSettings(newSettings);
    setSettings(updated);
  };

  const refreshRecentPdfs = async () => {
    setIsLoadingHistory(true);
    const history = await getRecentPdfs();
    setRecentPdfs(history);
    setIsLoadingHistory(false);
  };

  const deletePdf = async (id: string, deletePhysicalFile = true) => {
    await removeRecentPdf(id, deletePhysicalFile);
    await refreshRecentPdfs();
  };

  const renamePdf = async (id: string, newName: string) => {
    const updated = await updateRecentPdfName(id, newName);
    await refreshRecentPdfs();
    return updated;
  };

  const clearHistory = async (deletePhysicalFiles = false) => {
    await purgeRecentHistory(deletePhysicalFiles);
    await refreshRecentPdfs();
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        themeMode: activeThemeMode,
        theme,
        recentPdfs,
        isLoadingHistory,
        updateSettings,
        refreshRecentPdfs,
        deletePdf,
        renamePdf,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
