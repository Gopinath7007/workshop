import type { OcrProvider, OcrScanResult } from './types';
import { normalizeIndianRegistration } from './types';

/**
 * Camera/image OCR stand-in. Native ML Kit can replace this via setOcrProvider().
 * Tries to extract a plate from the URI/filename; otherwise returns a rotating demo plate.
 */
const DEMO_SEQUENCE = ['MH12AB1234', 'KA01MJ9087', 'TN09BC4455'];

export class CameraOcrProvider implements OcrProvider {
  readonly name = 'camera-heuristic';
  private cursor = 0;

  async extractTextFromImage(uri: string): Promise<OcrScanResult> {
    const fromUri = normalizeIndianRegistration(uri.replace(/[^A-Za-z0-9]/g, ' '));
    if (fromUri) {
      return {
        rawText: fromUri,
        registrationNumber: fromUri,
        confidence: 0.82,
        provider: this.name,
      };
    }

    const sample = DEMO_SEQUENCE[this.cursor % DEMO_SEQUENCE.length];
    this.cursor += 1;
    return {
      rawText: `IND\n${sample}`,
      registrationNumber: sample,
      confidence: 0.7,
      provider: this.name,
    };
  }
}
