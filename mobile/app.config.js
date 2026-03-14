const IS_DEV = process.env.APP_VARIANT !== 'preview' && process.env.APP_VARIANT !== 'production';

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
    plugins: [
      ...(IS_DEV ? ["expo-dev-client"] : []),
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
      "expo-navigation-bar",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      ],
    ],
  },
});
