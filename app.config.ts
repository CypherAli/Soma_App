import type { ExpoConfig, ConfigContext } from "expo/config";
import { version } from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Soma",
  slug: "soma-mobile",
  version,
  scheme: "soma",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: { supportsTablet: true, bundleIdentifier: "vn.soma.mobile" },
  android: {
    package: "vn.soma.mobile",
    versionCode: 12,
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
    [
      "expo-image-picker",
      {
        cameraPermission: false,
        microphonePermission: false,
        photosPermission: "Chọn ảnh để làm ảnh đại diện tài khoản Soma.",
      },
    ],
    "expo-asset",
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
