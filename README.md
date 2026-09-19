# Pixvoro - Image to PDF Converter & Smart PDF Optimizer (Android)

> **Fast. Private. Offline. Completely Ad-Free.**

Pixvoro is a production-ready, high-performance Android mobile application built with **React Native**, **Expo SDK**, and **TypeScript**. It converts single or multiple images (JPG, PNG, WEBP) into crisp, customizable, and lightweight PDF documents locally on your device without requiring an internet connection or account creation.

---

## 🌟 Key Features

- ⚡ **Fast Local Conversion**: On-device PDF compilation using `pdf-lib` and `expo-image-manipulator`.
- 🗜️ **Advanced Smart PDF Compression**:
  - **Compression Modes**:
    - `Small Size`: Aggressive optimization for WhatsApp & Email sharing (~110 DPI, 58% JPEG).
    - `Balanced` (**Default**): Optimal ratio between high readability and small size (~150 DPI, 75% JPEG).
    - `High Quality`: Great for printing and archiving (~220 DPI, 86% JPEG).
    - `Maximum Quality`: Minimal compression (~300 DPI, 95% JPEG).
    - `Custom`: Fine-tune quality with interactive step selector.
  - **Smart Resolution & DPI Target**: Automatically calculates resolution based on page size; **never upscales low-res photos**.
  - **Format Optimization**: Converts non-transparent photo PNGs to compressed JPEG while preserving transparent PNGs.
  - **Target PDF Size**: Set target size limits (`Under 1 MB`, `Under 2 MB`, `Under 5 MB`, `Under 10 MB`).
  - **Document Mode**: Sharpens text contrast for scanned paper documents.
  - **Grayscale Filter**: Converts photos to black & white for paper documents to slash file size.
  - **Compression Preview & Statistics**: Live size estimation before creation + before/after metrics on Result screen.
- 📄 **Compress Existing PDF**: Pick an existing PDF on your device and optimize its file size 100% offline.
- 🔒 **100% Private**: Zero cloud uploads, zero remote analytics, zero data collection.
- 📱 **Works Offline**: Complete functionality without internet or network requests.
- 🚫 **Completely Ad-Free**: No AdMob, banners, interstitials, video ads, or paywalls.
- 🎨 **Modern Design System**: Polished Light and Dark theme support with responsive UI components.

---

## 📐 PDF Customization Options

- **Page Sizes**: A4, Letter, Legal, or Original Image Dimensions.
- **Orientations**: Auto (detects image aspect ratio per page), Portrait, Landscape.
- **Margins**: None, Small (0.25"), Medium (0.5"), Large (0.75").
- **Image Fit Modes**: Fit to page (contain aspect ratio), Fill page (cover), Original ratio.

---

## 📂 Project Structure

```text
Pixvoro/
├── App.tsx                  # Application entry point with providers & status bar
├── app.json                 # Expo config (package: com.pixvoro.app)
├── package.json             # App dependencies
├── tsconfig.json            # Strict TypeScript configuration
└── src/
    ├── components/          # UI Components
    │   ├── Button.tsx       # Reusable button with variants & loading state
    │   ├── CompressionBar.tsx# Visual size reduction comparison bar
    │   ├── EmptyState.tsx   # Clean zero-state display
    │   ├── FullscreenImageModal.tsx # High-res image preview modal
    │   ├── Header.tsx       # App bar with logo, title, and back navigation
    │   ├── ImageCard.tsx    # Item card with reorder, rotate, & delete controls
    │   ├── ProgressModal.tsx# Real-time PDF generation progress modal
    │   └── RecentPdfCard.tsx# Recent PDF card with Open, Share, Rename, & Delete
    ├── constants/           # Dimensions, PostScript points, DPI & compression presets
    │   └── pdfPresets.ts
    ├── context/             # Global React state & active theme provider
    │   └── AppContext.tsx
    ├── navigation/          # React Navigation stack configuration
    │   └── AppNavigator.tsx
    ├── screens/             # App screens
    │   ├── HomeScreen.tsx           # Dashboard with CTAs & recent PDFs
    │   ├── ImageOrganizerScreen.tsx # Reorderable image editor list
    │   ├── PdfSettingsScreen.tsx    # Page size, orientation, & compression settings
    │   ├── PdfResultScreen.tsx      # Celebration & compression statistics
    │   └── SettingsScreen.tsx       # Theme, PDF defaults, & storage stats
    ├── services/            # Engine & Storage layer
    │   ├── pdfEngineService.ts      # Core PDF compiler with target size adjustment
    │   ├── pdfCompressorService.ts  # On-device existing PDF re-compressor
    │   └── storageService.ts        # AsyncStorage & FileSystem manager
    ├── theme/               # Light & Dark color design tokens
    │   └── index.ts
    ├── types/               # TypeScript models
    │   └── index.ts
    └── utils/               # Image processor, DPI calculation, sanitization, & helpers
        ├── imageProcessor.ts
        └── helpers.ts
```

---

## 🚀 Installation & Setup

1. **Navigate to project directory**:
   ```bash
   cd Pixvoro
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Run on Android device or emulator**:
   ```bash
   npm run android
   ```

---

## 📦 Android Build Instructions

### Local APK Build
```bash
npx expo run:android --variant release
```

### Build with EAS (Expo Application Services)
```bash
eas build --platform android --profile preview
```

---

## 🔒 Privacy Approach

Pixvoro strictly adheres to on-device privacy:
- All image transformations, resolution downscaling, and binary PDF compilation occur strictly in local application memory.
- No network requests or cloud services are used.
- Intermediate temporary files are cleaned up automatically after PDF compilation.

---

## 📄 License

MIT License. Free for personal and commercial use.
