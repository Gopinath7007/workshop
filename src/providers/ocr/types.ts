/**
 * OCR provider abstraction — swap ML Kit / cloud OCR without touching UI.
 *
 * Flow: Capture Image → OCR → Extract Reg Number → Validate → Fetch Vehicle.
 */
export interface OcrScanResult {
  rawText: string;
  registrationNumber: string | null;
  confidence: number;
  provider: string;
}

export interface OcrProvider {
  readonly name: string;
  extractTextFromImage(uri: string): Promise<OcrScanResult>;
}

/** Normalizes Indian registration numbers (e.g. MH12AB1234). */
export function normalizeIndianRegistration(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = cleaned.match(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/);
  return match ? match[0] : null;
}
