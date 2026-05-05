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
      // Universal Links — magic-link auth (https://padmagnet.com/auth/mobile-callback*)
      // opens the app directly when installed, instead of bouncing through Mobile Safari.
      // Requires apple-app-site-association at https://padmagnet.com/.well-known/
      // (currently shipped with placeholder TEAM_ID — replace before iOS launch).
      // Same HTTPS URL stays the magic-link emailRedirectTo target, so Supabase
      // allowlist needs no change.
      associatedDomains: ["applinks:padmagnet.com"],
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
      // Android App Links — auto-verified intent filter so tapping the magic
      // link in any email client opens the app directly without a "Open
      // with..." chooser. autoVerify=true triggers the OS to fetch
      // /.well-known/assetlinks.json from padmagnet.com on first install +
      // periodic re-checks; mismatch (or missing file) silently falls back
      // to the existing web intermediary at /auth/mobile-callback. The
      // assetlinks.json must list the SHA-256 of whichever cert is on the
      // device — the EAS production keystore SHA-256 covers preview-channel
      // installs; the Play App Signing key SHA-256 must be appended after
      // the first AAB upload to Play Console (see post-build-todo.md
      // Phase 2). Both fingerprints in one assetlinks.json works.
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "padmagnet.com",
              pathPrefix: "/auth/mobile-callback",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
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
