/**
 * Sanitizes input string to produce a safe filesystem filename.
 */
export function sanitizeFilename(name: string): string {
  let cleaned = name.trim();
  // Remove extension if user added it manually to avoid duplicate .pdf
  if (cleaned.toLowerCase().endsWith('.pdf')) {
    cleaned = cleaned.substring(0, cleaned.length - 4);
  }
  // Replace illegal characters with underscore
  cleaned = cleaned.replace(/[/\\?%*:|"<>]/g, '_');
  // Fallback if empty
  if (!cleaned) {
    cleaned = generateDefaultPdfName().replace('.pdf', '');
  }
  return `${cleaned}.pdf`;
}

/**
 * Generates default PDF filename in the format Pixvoro_YYYY-MM-DD_HH-mm.pdf
 */
export function generateDefaultPdfName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `Pixvoro_${year}-${month}-${day}_${hours}-${minutes}.pdf`;
}

/**
 * Formats byte size into human readable string (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats timestamp into readable date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Rotates angle by +90 degrees (0 -> 90 -> 180 -> 270 -> 0)
 */
export function rotateAngle(currentAngle: number): number {
  return (currentAngle + 90) % 360;
}
