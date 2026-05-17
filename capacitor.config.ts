// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.txtreader.app',
  appName: 'TXT阅读器',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
