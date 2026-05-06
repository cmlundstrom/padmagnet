#!/usr/bin/env bash
# Sourced by magic-link smoke wrappers AFTER pm clear. Warms up the OTA
# bundle so the auth-callback fixes (commits 4b1812f + fa2100b, only
# present in the OTA — the build at 88cee9a is older) are active before
# the smoke fires its magic-link openLink.
#
# Why this exists:
#   - pm clear wipes the cached OTA bundle along with app data. The
#     bundled APK reverts to runtime version 1.0.0 commit 88cee9a, which
#     does NOT have the /auth/mobile-callback route nor useLinkingURL.
#   - Magic-link tap on the bundled-only bundle would 404 ("Unmatched
#     Route") or hit the warm-launch token-capture hole.
#   - Two cold launches force the OTA download + apply cycle:
#       Launch 1: app starts on bundled bundle, expo-updates downloads
#                 the latest from EAS in the background (~5-10s).
#       Launch 2: app starts on the freshly-applied OTA bundle.
#
# When we ship a NEW EAS build that includes the auth-callback fixes in
# its bundled bundle, this warmup becomes unnecessary and can be removed.
APP_ID="${APP_ID:-com.padmagnet.app}"

echo "  [warmup] cold launch 1 (downloads OTA in background)..."
adb shell am start -W ${APP_ID}/.MainActivity >/dev/null
sleep 12

echo "  [warmup] force-stop + cold launch 2 (applies OTA bundle)..."
adb shell am force-stop ${APP_ID} >/dev/null
sleep 1
adb shell am start -W ${APP_ID}/.MainActivity >/dev/null
sleep 5

echo "  [warmup] final force-stop — app ready in cold state with OTA bundle"
adb shell am force-stop ${APP_ID} >/dev/null
