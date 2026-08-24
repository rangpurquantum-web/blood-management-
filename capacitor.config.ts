import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bloodmanager.app',
  appName: 'Blood Management System',
  webDir: 'public',
  server: {
    url: 'https://blood-management-livid.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      showSpinner: true,
      spinnerColor: '#ffffff',
      androidSpinnerStyle: 'large',
    },
  },
};

export default config;