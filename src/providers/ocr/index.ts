import { CameraOcrProvider } from './cameraOcrProvider';
import { MockOcrProvider } from './mockOcrProvider';
import type { OcrProvider } from './types';

let active: OcrProvider = new CameraOcrProvider();

export function getOcrProvider(): OcrProvider {
  return active;
}

export function setOcrProvider(provider: OcrProvider): void {
  active = provider;
}

export * from './types';
export { CameraOcrProvider } from './cameraOcrProvider';
export { MockOcrProvider } from './mockOcrProvider';
