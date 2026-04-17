// Settings sub-screens. Stage 3 audit (2026-04-16): only delete-account is wired
// for now (Option A scope). Edit Profile, Notifications, Subscription, Preferences
// have testIDs scoped in the audit but deferred until a flow needs them.
output.settings = {
  deleteAccount: {
    confirmationInput: 'settings-delete-account-confirmation-input',
    confirmButton: 'settings-delete-account-confirm-button',
    cancelButton: 'settings-delete-account-cancel-button',
  },
};
