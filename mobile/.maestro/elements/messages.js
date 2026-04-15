// Messages inbox, conversation view, message composition.
// Stage 3 audit (2026-04-14): source-verified testIDs. Pending rebuild for live
// hierarchy check (current preview build = c31eceea, pre-testID).
// MessagesScreen is shared between (tenant)/messages and (owner)/messages —
// the same testIDs work for both roles.
output.messages = {
  inbox: {
    list: 'messages-inbox-list',
    // One per row — Maestro should use index-based matching when multiple rows render.
    conversationRow: 'conversation-row',
    emptyState: 'messages-inbox-empty',
  },
  conversation: {
    messageInput: 'conversation-message-input',
    sendButton: 'conversation-send-button',
    // One per rendered bubble; senderLabel only appears on external/multi-party
    // conversations (not rendered when senderLabel prop is null).
    messageBubble: 'conversation-message-bubble',
    senderLabel: 'conversation-sender-label',
  },
};
