// Deletes rows seeded earlier in this flow. Call at end of flow or via
// onFlowComplete hook to avoid leaking test rows between runs.
//
// Order matters: conversations.{tenant_user_id,owner_user_id} FKs are NOT
// ON DELETE CASCADE (only messages→conversations is), so we must delete
// seeded conversations before deleting their associated auth users, or
// the auth delete will fail with FK violation.

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

function deleteConversation(conversationId) {
  const resp = http.delete(
    SUPABASE_URL + '/rest/v1/conversations?id=eq.' + conversationId,
    { headers: adminHeaders }
  );
  if (!resp.ok) {
    console.log('Conversation cleanup failed for ' + conversationId + ': HTTP ' + resp.status);
  }
}

function deleteUser(userId) {
  const resp = http.delete(
    SUPABASE_URL + '/auth/v1/admin/users/' + userId,
    { headers: adminHeaders }
  );
  if (!resp.ok) {
    console.log('Cleanup failed for ' + userId + ': HTTP ' + resp.status);
  }
}

if (output.seed && output.seed.conversation && output.seed.conversation.conversationId) {
  deleteConversation(output.seed.conversation.conversationId);
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
