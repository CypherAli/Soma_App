import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Soma",
  slug: "soma-mobile",
  version: "1.0.3",
  scheme: "soma",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: { supportsTablet: true, bundleIdentifier: "vn.soma.mobile" },
  android: {
    package: "vn.soma.mobile",
    versionCode: 4,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#18232E",
    },
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
    ],
  },
  web: {
    output: "single",
    favicon: "./assets/favicon.png",
    name: "Soma Mobile",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-web-browser",
    [
      "expo-build-properties",
      {
        android: { usesCleartextTraffic: process.env.SOMA_ALLOW_HTTP === "1" },
      },
    ],
  ],
  extra: {
    allowHttp: process.env.SOMA_ALLOW_HTTP === "1",
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "",
  },
  experiments: { typedRoutes: true },
});
