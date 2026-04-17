// Auth surfaces — AuthBottomSheet, Manila folder L1/L2, biometric CTAs.
// Stage 3 audit (2026-04-14): source-verified. Live-verified 2026-04-16 on build 251b5712.
output.auth = {
  bottomSheet: {
    emailInput: 'auth-sheet-email-input',
    passwordInput: 'auth-sheet-password-input',
    signInCta: 'auth-sheet-sign-in-cta',
    eyeToggle: 'auth-sheet-eye-toggle',
    // No discrete create-account link: sign-up is implicit fallback in handlePassword().
    createAccountLink: null,
    // No forgot-password link: replaced by Magic Link flow.
    forgotPasswordLink: null,
  },
  manilaL1: {
    primaryCta: 'manila-l1-primary-cta',
    // "Browse Nearby Rentals" button — functionally dismisses L1 (calls l1Ref.dismiss()).
    dismiss: 'manila-l1-dismiss',
  },
  manilaL2: {
    enableLocationCta: 'manila-l2-enable-location-cta',
  },
};
