// Listing swipe deck, listing detail, owner create-listing flow.
// Stage 3 audit (2026-04-14): source-verified. Live-verified 2026-04-16 on build 251b5712.
output.listings = {
  swipeDeck: {
    container: 'swipe-deck-container',
    card: 'swipe-deck-card',
    likeButton: 'swipe-deck-like-button',
    passButton: 'swipe-deck-pass-button',
  },
  detail: {
    // BackButton default testID — shared across every Header with showBack.
    // Safe to target while listing detail is the foreground screen.
    backButton: 'back-button',
    contactOwner: 'listing-detail-contact-owner',
  },
  ownerCreate: {
    // Address section has 5 inputs; this targets Street Name (required, primary anchor).
    addressInput: 'owner-create-address-input',
    priceInput: 'owner-create-price-input',
    submitCta: 'owner-create-submit-cta',
  },
};
