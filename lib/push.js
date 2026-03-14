/**
 * Expo push notification helper.
 * Uses Expo's push API (no SDK needed — just a POST).
 */

/**
 * Send a push notification via Expo.
 * @param {string} token - Expo push token (ExponentPushToken[...])
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} data - Custom data payload (e.g. { conversationId })
 */
export async function sendPushNotification(token, title, body, data = {}) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      badge: 1,
    }),
  });
  return response.json();
}
