import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bloodmanager.app',
  appName: 'Blood Management System',
  webDir: 'public',
  server: {
    url: 'https://blood-management-livid.vercel.app',
    cleartext: false,
  },
};

export default config;