// Profile screens (tenant + owner) and the role switcher.
// Stage 3 audit (2026-04-16): added Option A surgical batch — sign-out, role switch,
// delete-account entry point, plus the most-used MenuItem destinations. Live verification
// pending the next preview build (testIDs ship in source but not in build 251b5712).
output.profile = {
  // Shared between (tenant)/profile.js and (owner)/profile.js — only one renders at a time.
  signOutButton: 'profile-sign-out-button',
  deleteAccountLink: 'profile-delete-account-link',
  // Owner-only: the anon "Sign in to manage listings" sign-in card.
  signInCardButton: 'profile-sign-in-card-button',
  // MenuItem destinations exposed via testID prop on the local MenuItem component.
  // Each appears on either tenant or owner profile, never both.
  editButton: 'profile-edit-button',
  notificationsButton: 'profile-notifications-button',
  preferencesButton: 'profile-preferences-button',   // tenant-only
  subscriptionButton: 'profile-subscription-button', // owner-only
  addRoleButton: 'profile-add-role-button',          // visible when roles.length === 1
  roleSwitcher: {
    renter: 'role-switcher-renter',
    owner: 'role-switcher-owner',
  },
};
