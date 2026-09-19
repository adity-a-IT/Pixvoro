import {
  PageSize,
  MarginOption,
  PDFQuality,
  PDFSettings,
  AppSettings,
  CompressionMode,
  TargetSizeOption,
} from '../types';

// PDF Dimensions in Points (72 points = 1 inch)
export const PAGE_SIZES: Record<Exclude<PageSize, 'Original'>, { width: number; height: number; name: string }> = {
  A4: { width: 595.28, height: 841.89, name: 'A4 (210 × 297 mm)' },
  Letter: { width: 612.0, height: 792.0, name: 'Letter (8.5 × 11 in)' },
  Legal: { width: 612.0, height: 1008.0, name: 'Legal (8.5 × 14 in)' },
};

export const MARGINS: Record<MarginOption, number> = {
  None: 0,
  Small: 18,  // 0.25 inch
  Medium: 36, // 0.5 inch
  Large: 54,  // 0.75 inch
};

// Legacy quality mapping
export const QUALITY_PRESETS: Record<PDFQuality, { jpegQuality: number; maxDimension: number }> = {
  Standard: { jpegQuality: 0.65, maxDimension: 1200 },
  High: { jpegQuality: 0.82, maxDimension: 1800 },
  Maximum: { jpegQuality: 0.95, maxDimension: 2800 },
};

// Advanced Smart Compression Modes mapping (Target DPI & JPEG Quality)
export const COMPRESSION_PRESETS: Record<
  Exclude<CompressionMode, 'Custom'>,
  { targetDpi: number; jpegQuality: number; description: string }
> = {
  Small: {
    targetDpi: 110,
    jpegQuality: 0.58,
    description: 'Smallest practical file size (Ideal for WhatsApp, Email)',
  },
  Balanced: {
    targetDpi: 150,
    jpegQuality: 0.75,
    description: 'Best balance between quality and size (Recommended)',
  },
  High: {
    targetDpi: 220,
    jpegQuality: 0.86,
    description: 'Better quality, larger file (Great for printing)',
  },
  Maximum: {
    targetDpi: 300,
    jpegQuality: 0.95,
    description: 'Preserve maximum image detail (Lossless preview)',
  },
};

export const TARGET_SIZE_BYTES: Record<Exclude<TargetSizeOption, 'NoTarget'>, number> = {
  '1MB': 1 * 1024 * 1024,
  '2MB': 2 * 1024 * 1024,
  '5MB': 5 * 1024 * 1024,
  '10MB': 10 * 1024 * 1024,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  defaultPageSize: 'A4',
  defaultOrientation: 'Auto',
  defaultMargin: 'Small',
  defaultQuality: 'High',
  defaultImageFit: 'Fit',
  defaultCompressionMode: 'Balanced',
  defaultSmartCompression: true,
  defaultTargetSize: 'NoTarget',
  defaultDocumentMode: false,
  defaultGrayscale: false,
};

export const DEFAULT_PDF_SETTINGS: PDFSettings = {
  pdfName: '',
  pageSize: 'A4',
  orientation: 'Auto',
  margin: 'Small',
  imageFit: 'Fit',
  quality: 'High',
  compressionMode: 'Balanced',
  smartCompression: true,
  targetSize: 'NoTarget',
  documentMode: false,
  grayscale: false,
  blackAndWhite: false,
  qualitySlider: 50, // 50 = Balanced position
};
