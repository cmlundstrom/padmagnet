// Welcome splash — first screen on cold start.
// Updated 2026-04-25 for the new cinematic splash (hero rotator + dual CTAs +
// FeatureBar). Field names kept stable so existing smoke flows still
// reference the same keys.
output.roleGate = {
  findRental: 'Start Swiping Rentals',     // primary renter CTA
  listProperty: 'List Your Property',      // secondary owner CTA
  signIn: 'Sign In',                       // bottom link to auth
  brandTitle: 'PadMagnet',                 // wordmark
  // Headline copy — assert one of these to confirm the welcome splash is up
  headlineStop: 'Stop Searching.',
  headlineStart: 'Start ',
  subTagline: 'Powered by ',
};
