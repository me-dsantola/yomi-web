export type DevicePlatform = 'android' | 'ios' | 'desktop';
export type AndroidAbi = 'arm64-v8a' | 'armeabi-v7a' | 'x86_64';

export interface DeviceDetectionResult {
  platform: DevicePlatform;
  recommendedAbi: AndroidAbi;
  label: string;
}

export type ClientDeviceInfo = DeviceDetectionResult;

/**
 * Detecta a plataforma do visitante a partir do User-Agent (e plataforma se disponível)
 * para personalizar a Central de Download Instantâneo:
 * - Android: download direto do APK arm64-v8a com tamanho real
 * - Desktop: botão de download + destaque para QR Code
 * - iOS/iPadOS: aviso de exclusividade Android + CTA para o leitor web (/explorar)
 */
export function detectDevicePlatform(
  userAgent: string = '',
  maxTouchPoints: number = 0
): DeviceDetectionResult {
  const ua = userAgent.toLowerCase();

  // iOS / iPadOS (incluindo iPads com UA Macintosh + touch)
  const isIphoneOrIpod = /iphone|ipod|ipad/.test(ua);
  const isIpadOsDesktopMode = /macintosh/.test(ua) && maxTouchPoints > 1;
  if (isIphoneOrIpod || isIpadOsDesktopMode) {
    return {
      platform: 'ios',
      recommendedAbi: 'arm64-v8a',
      label: 'iOS / iPadOS',
    };
  }

  if (/android/.test(ua)) {
    return {
      platform: 'android',
      recommendedAbi: 'arm64-v8a',
      label: 'Android',
    };
  }

  return {
    platform: 'desktop',
    recommendedAbi: 'arm64-v8a',
    label: 'Computador / Notebook',
  };
}

export const detectClientDevice = detectDevicePlatform;
