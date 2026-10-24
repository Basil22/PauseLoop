import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * PauseLoop uses a dynamic config so the production build can ship without the
 * INTERNET permission while development builds keep Metro connectivity.
 */
const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PauseLoop',
  slug: 'pauseloop',
  description: 'Break the loop. A private, on-device pause from doomscrolling.',
  version: '0.1.0',
  platforms: ['android', 'web'],
  orientation: 'portrait',
  scheme: 'pauseloop',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  android: {
    package: 'com.pauseloop.app',
    versionCode: 1,
    allowBackup: false,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#08100D',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // The dev client needs INTERNET for Metro. The production release must not.
    blockedPermissions: IS_PRODUCTION ? ['android.permission.INTERNET'] : [],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#08100D',
        image: './assets/images/splash-icon.png',
        imageWidth: 140,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
