export default ({ config }) => ({
  expo: {
    name: "PadMagnet",
    slug: "padmagnet",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    scheme: "padmagnet",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FFF7F5",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.padmagnet.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "PadMagnet uses your location to show nearby rental listings on the map.",
        NSPhotoLibraryUsageDescription:
          "PadMagnet needs photo access to add images to your listing.",
        NSCameraUsageDescription:
          "PadMagnet needs camera access to take photos of your property.",
      },
    },
    android: {
      package: "com.padmagnet.app",
      adaptiveIcon: {
        backgroundColor: "#E8603C",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "READ_MEDIA_IMAGES",
        "CAMERA",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    extra: {
      eas: {
        projectId: "e669b547-8cac-4a4d-a210-d148b3dcc02e",
      },
    },
    // EAS Update — over-the-air JS bundle delivery. Production AABs ship
    // with the EAS Update endpoint baked in; post-launch JS-only fixes
    // (UI, copy, business logic, perf) ship via `eas update --channel
    // production` and reach all live users in <2 min, no Play Store
    // re-review required. Native changes (permissions, new modules,
    // app icon, splash, version bump, RN bump, AndroidManifest edits)
    // still require a fresh AAB + Play Store re-review.
    updates: {
      url: "https://u.expo.dev/e669b547-8cac-4a4d-a210-d148b3dcc02e",
    },
    // Runtime version ties an OTA bundle to a compatible native build.
    // 'appVersion' policy means: bump the version field above (1.0.0 →
    // 1.0.1) when shipping a native build; JS-only updates inherit the
    // current app version's runtime, so existing installs receive them.
    runtimeVersion: {
      policy: "appVersion",
    },
    plugins: [
      "expo-dev-client",
      "expo-router",
      "expo-font",
      "expo-image-picker",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "PadMagnet uses your location to show nearby rental listings.",
        },
      ],
      "expo-web-browser",
      "expo-image",
      "expo-secure-store",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      ],
    ],
  },
});
