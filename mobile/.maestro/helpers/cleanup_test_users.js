// Deletes users seeded earlier in this flow. Call at end of flow or via
// onFlowComplete hook to avoid leaking test rows between runs.

function deleteUser(userId) {
  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + userId,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );
  if (!resp.ok) {
    console.log('Cleanup failed for ' + userId + ': HTTP ' + resp.status);
  }
}

if (output.seed && output.seed.renter && output.seed.renter.userId) {
  deleteUser(output.seed.renter.userId);
}
if (output.seed && output.seed.owner && output.seed.owner.userId) {
  deleteUser(output.seed.owner.userId);
}
if (output.seed && output.seed.dualRole && output.seed.dualRole.userId) {
  deleteUser(output.seed.dualRole.userId);
}
