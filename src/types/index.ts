export type PageSize = 'A4' | 'Letter' | 'Legal' | 'Original';
export type Orientation = 'Auto' | 'Portrait' | 'Landscape';
export type MarginOption = 'None' | 'Small' | 'Medium' | 'Large';
export type ImageFit = 'Fit' | 'Fill' | 'Original';
export type PDFQuality = 'Standard' | 'High' | 'Maximum';
export type ThemeMode = 'system' | 'light' | 'dark';

export type CompressionMode = 'Small' | 'Balanced' | 'High' | 'Maximum' | 'Custom';
export type TargetSizeOption = 'NoTarget' | '1MB' | '2MB' | '5MB' | '10MB';

export interface ImageItem {
  id: string;
  uri: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270 degrees
  filename?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface PDFSettings {
  pdfName: string;
  pageSize: PageSize;
  orientation: Orientation;
  margin: MarginOption;
  imageFit: ImageFit;
  quality: PDFQuality;
  
  // Advanced Smart Compression Features
  compressionMode: CompressionMode;
  smartCompression: boolean;
  targetSize: TargetSizeOption;
  documentMode: boolean;
  grayscale: boolean;
  blackAndWhite: boolean;
  qualitySlider: number; // 0 (smallest) to 100 (max quality)
}

export interface RecentPDF {
  id: string;
  name: string;
  uri: string;
  createdAt: number;
  pageCount: number;
  fileSize: number; // final generated file size in bytes
  
  // Compression statistics
  originalSizeBytes?: number;
  savedBytes?: number;
  compressionRatio?: number; // e.g. 82.5%
  targetNotice?: string; // e.g. "Couldn't reach 2 MB without significantly reducing quality."
}

export interface AppSettings {
  theme: ThemeMode;
  defaultPageSize: PageSize;
  defaultOrientation: Orientation;
  defaultMargin: MarginOption;
  defaultQuality: PDFQuality;
  defaultImageFit: ImageFit;
  
  // Compression Defaults
  defaultCompressionMode: CompressionMode;
  defaultSmartCompression: boolean;
  defaultTargetSize: TargetSizeOption;
  defaultDocumentMode: boolean;
  defaultGrayscale: boolean;
}

export interface CompressionEstimate {
  originalTotalBytes: number;
  estimatedPdfBytes: number;
  estimatedReductionPercent: number;
}

export type WatermarkPosition = 'Center' | 'Top' | 'Bottom' | 'Diagonal';

export interface WatermarkOptions {
  text: string;
  opacity: number; // 0.1 to 1.0
  fontSize: number;
  colorHex: string;
  position: WatermarkPosition;
  targetPages?: 'all' | 'first' | 'last';
}

export type PageNumberPosition = 'Header' | 'Footer';

export interface PageNumberOptions {
  enabled: boolean;
  position: PageNumberPosition;
  format: 'number' | 'pageOfTotal'; // e.g. "Page 1" or "Page 1 of 10"
  fontSize: number;
}

export interface PdfMetadataOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
}

export interface PdfPageItem {
  index: number; // original 0-based page index
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
}

export interface PdfDocumentDetails {
  uri: string;
  name: string;
  pageCount: number;
  fileSize: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  pages: PdfPageItem[];
}

export type RootStackParamList = {
  Home: undefined;
  ImageSelection: undefined;
  ImageOrganizer: { selectedImages: ImageItem[] };
  PdfSettings: { images: ImageItem[] };
  PdfResult: { pdf: RecentPDF };
  Settings: undefined;
  PdfViewer: { pdfUri: string; pdfName: string };
  PdfEditor: { pdfUri: string; pdfName: string };
};

