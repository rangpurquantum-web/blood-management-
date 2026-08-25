import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bloodmanager.app',
  appName: 'QBlood',
  webDir: 'public',
  server: {
    url: 'https://blood-management-livid.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#3D0B12',
      showSpinner: true,
      spinnerColor: '#ffffff',
      androidSpinnerStyle: 'large',
    },
  },
};

export default config;
