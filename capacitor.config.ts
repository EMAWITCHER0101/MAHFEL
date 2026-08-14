import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mahfel.app',
  appName: 'MAHFEL',
  webDir: 'out',
  server: {
    url: 'https://app.soha-sima.ir',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: ['87.248.145.44', 'soha-sima.ir', '*.soha-sima.ir']
  }
};

export default config;
