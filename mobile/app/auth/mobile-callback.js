// Native route at /auth/mobile-callback — added 2026-05-05 to make Android
// App Links + iOS Universal Links work end-to-end. The HTTPS magic-link URL
// (https://padmagnet.com/auth/mobile-callback?nonce=...&access_token=...)
// is verified for com.padmagnet.app via /.well-known/assetlinks.json and
// must resolve to a native screen at the matching path. Without this file,
// expo-router would render its "Unmatched Route" 404 because the existing
// handler is at /auth-callback (no /auth/ prefix), used by OAuth's
// makeRedirectUri({ scheme: 'padmagnet', path: 'auth-callback' }).
//
// Two routes, one handler — the underlying AuthCallbackScreen reads tokens
// from useLocalSearchParams() AND Linking.getInitialURL() AND
// Linking.addEventListener('url', ...), so it works whether tokens arrive
// in URL query, hash fragment, or via warm-app event delivery. The OAuth
// path /auth-callback stays as-is for Google/Facebook redirects.
export { default } from '../auth-callback';
