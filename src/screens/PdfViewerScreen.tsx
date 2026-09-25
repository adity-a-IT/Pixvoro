import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { formatBytes, formatDate } from '../utils/helpers';
import { loadPdfDetails } from '../services/pdfEditService';
import { readUriAsBase64, shareOrDownloadPdf, isWeb, ensureLocalPdfUri } from '../utils/platformHelper';
import { Spacing, BorderRadius } from '../theme';

type PdfViewerProps = NativeStackScreenProps<RootStackParamList, 'PdfViewer'>;

export const PdfViewerScreen: React.FC<PdfViewerProps> = ({ route, navigation }) => {
  const { pdfUri, pdfName } = route.params;
  const { theme } = useApp();
  const colors = theme.colors;

  const [loading, setLoading] = useState(true);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [fileSize, setFileSize] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadDocument();
  }, [pdfUri]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const safeUri = await ensureLocalPdfUri(pdfUri, pdfName);
      const b64 = await readUriAsBase64(safeUri);
      setBase64Data(b64);

      const details = await loadPdfDetails(safeUri, pdfName);
      setPageCount(details.pageCount);
      setFileSize(details.fileSize);
      setTitle(details.title || '');
      setAuthor(details.author || '');
    } catch (error) {
      console.error('Failed to load PDF in reader:', error);
      Alert.alert('Error Loading PDF', 'Could not open PDF file. It might be corrupted or inaccessible.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await shareOrDownloadPdf(pdfUri, pdfName);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleEdit = () => {
    navigation.navigate('PdfEditor', { pdfUri, pdfName });
  };

  const generateHtml = () => {
    if (!base64Data) return '';
    const bg = isDarkMode ? '#121212' : '#F4F5F8';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html {
              width: 100%;
              min-height: 100%;
              background-color: ${bg};
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 12px 6px;
              gap: 16px;
              overflow-x: hidden;
              overflow-y: auto;
              -webkit-overflow-scrolling: touch;
            }
            .pdf-page-canvas {
              width: ${zoomScale}% !important;
              max-width: 95%;
              height: auto !important;
              border-radius: 4px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.18);
              filter: ${isDarkMode ? 'invert(0.88) hue-rotate(180deg)' : 'none'};
              background-color: #ffffff;
            }
            #fallback-container {
              width: 100vw;
              height: 100vh;
              display: none;
            }
            #fallback-embed {
              width: 100%;
              height: 100%;
              border: none;
              filter: ${isDarkMode ? 'invert(0.88) hue-rotate(180deg)' : 'none'};
            }
          </style>
        </head>
        <body>
          <div id="pages-container" style="display:flex; flex-direction:column; align-items:center; width:100%; gap:14px;"></div>
          <div id="fallback-container">
            <embed id="fallback-embed" src="data:application/pdf;base64,${base64Data}" type="application/pdf" />
          </div>

          <script>
            (function() {
              try {
                var binary = atob("${base64Data}");
                var len = binary.length;
                var bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }

                if (window.pdfjsLib) {
                  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  pdfjsLib.getDocument({ data: bytes }).promise.then(async function(pdf) {
                    var container = document.getElementById('pages-container');
                    for (var num = 1; num <= pdf.numPages; num++) {
                      var page = await pdf.getPage(num);
                      var viewport = page.getViewport({ scale: 2.0 });
                      var canvas = document.createElement('canvas');
                      canvas.className = 'pdf-page-canvas';
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      container.appendChild(canvas);

                      var context = canvas.getContext('2d');
                      await page.render({ canvasContext: context, viewport: viewport }).promise;
                    }
                  }).catch(function(err) {
                    showFallback();
                  });
                } else {
                  showFallback();
                }
              } catch(e) {
                showFallback();
              }

              function showFallback() {
                var c = document.getElementById('pages-container');
                var f = document.getElementById('fallback-container');
                if (c) c.style.display = 'none';
                if (f) f.style.display = 'block';
              }
            })();
          </script>
        </body>
      </html>
    `;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header
        title={pdfName}
        subtitle={`${pageCount} ${pageCount === 1 ? 'Page' : 'Pages'} • ${formatBytes(fileSize)}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setInfoModalVisible(true)}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityLabel="Document Info"
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityLabel="Share PDF"
            >
              <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.editBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Edit PDF"
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading PDF Document...</Text>
        </View>
      ) : (
        <View style={styles.readerContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              src={`data:application/pdf;base64,${base64Data}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={pdfName}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: generateHtml() }}
              style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F4F5F8' }}
              scalesPageToFit={true}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Bottom Reader Control Bar */}
          <View style={[styles.bottomBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.zoomControls}>
              <TouchableOpacity
                onPress={() => setZoomScale((prev) => Math.max(50, prev - 25))}
                style={[styles.controlBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="remove-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.zoomText, { color: colors.textPrimary }]}>{zoomScale}%</Text>
              <TouchableOpacity
                onPress={() => setZoomScale((prev) => Math.min(250, prev + 25))}
                style={[styles.controlBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="add-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIsDarkMode(!isDarkMode)}
              style={[
                styles.modeBtn,
                { backgroundColor: isDarkMode ? colors.primary : colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name={isDarkMode ? 'moon' : 'moon-outline'}
                size={18}
                color={isDarkMode ? '#FFFFFF' : colors.textPrimary}
              />
              <Text style={[styles.modeText, { color: isDarkMode ? '#FFFFFF' : colors.textPrimary }]}>
                {isDarkMode ? 'Dark' : 'Light'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info Modal */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Document Details</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Filename</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{pdfName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total Pages</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{pageCount}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>File Size</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{formatBytes(fileSize)}</Text>
              </View>
              {title ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Title</Text>
                  <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{title}</Text>
                </View>
              ) : null}
              {author ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Author</Text>
                  <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{author}</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setInfoModalVisible(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  readerContainer: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoList: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeModalBtn: {
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
