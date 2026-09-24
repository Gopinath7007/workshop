import type { OcrProvider, OcrScanResult } from './types';
import { normalizeIndianRegistration } from './types';

/** Dev/web fallback until native ML Kit is wired. */
export class MockOcrProvider implements OcrProvider {
  readonly name = 'mock';

  async extractTextFromImage(_uri: string): Promise<OcrScanResult> {
    const sample = 'MH12AB1234';
    return {
      rawText: sample,
      registrationNumber: normalizeIndianRegistration(sample),
      confidence: 0.5,
      provider: this.name,
    };
  }
}
