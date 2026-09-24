import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { getOcrProvider, type OcrScanResult } from '../providers/ocr';
import { getVehicleInfoProvider, type VehicleInfo } from '../providers/vehicle-info';
import { normalizeIndianRegistration } from '../providers/ocr';

export type PlateScanOutcome = {
  imageUri: string;
  ocr: OcrScanResult;
  vehicleInfo: VehicleInfo | null;
};

async function ensureMediaPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestCameraPermissionsAsync();
  return asked.granted;
}

async function ensureLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return asked.granted;
}

async function runPipeline(imageUri: string): Promise<PlateScanOutcome> {
  const ocr = await getOcrProvider().extractTextFromImage(imageUri);
  const reg = ocr.registrationNumber ?? normalizeIndianRegistration(ocr.rawText);
  const vehicleInfo = reg
    ? await getVehicleInfoProvider().getVehicleDetails(reg)
    : null;
  return {
    imageUri,
    ocr: { ...ocr, registrationNumber: reg },
    vehicleInfo,
  };
}

/** Capture with camera → OCR → vehicle info. */
export async function scanPlateWithCamera(): Promise<PlateScanOutcome | null> {
  const ok = await ensureMediaPermission();
  if (!ok) throw new Error('Camera permission is required to scan plates.');

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
    allowsEditing: true,
    aspect: [16, 9],
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return runPipeline(result.assets[0].uri);
}

/** Pick an image → OCR → vehicle info (web-friendly). */
export async function scanPlateFromLibrary(): Promise<PlateScanOutcome | null> {
  const ok = await ensureLibraryPermission();
  if (!ok) throw new Error('Photo library permission is required.');

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 0.7,
    allowsEditing: true,
    aspect: [16, 9],
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return runPipeline(result.assets[0].uri);
}

/** Manual registration lookup without an image. */
export async function lookupVehicleByRegistration(
  registrationNumber: string,
): Promise<VehicleInfo | null> {
  const provider = getVehicleInfoProvider();
  const valid = await provider.validateVehicle(registrationNumber);
  if (!valid) return null;
  return provider.getVehicleDetails(registrationNumber);
}
