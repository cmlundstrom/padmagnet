// Settings sub-screens. Stage 3 audit (2026-04-16): delete-account wired.
// Add-role wired 2026-04-18 for the Phase 3 dual-role self-service flow.
// Edit Profile, Notifications, Subscription, Preferences have testIDs scoped
// in the audit but deferred until a flow needs them.
output.settings = {
  deleteAccount: {
    confirmationInput: 'settings-delete-account-confirmation-input',
    confirmButton: 'settings-delete-account-confirm-button',
    cancelButton: 'settings-delete-account-cancel-button',
  },
  addRole: {
    confirmButton: 'settings-add-role-confirm-button',
    cancelButton: 'settings-add-role-cancel-button',
  },
};
