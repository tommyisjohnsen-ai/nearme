const webpush = require('web-push');

// Configure VAPID keys (generate with: npx web-push generate-vapid-keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@nearme.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to a user's stored subscription
 * @param {Object} subscription - Web Push subscription object from DB
 * @param {Object} payload - { title, body, icon, data }
 */
async function sendPushNotification(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log('[Push] VAPID keys not configured — skipping push notification');
    return;
  }
  if (!subscription) return;

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — could clean up DB here
      console.log('[Push] Subscription expired/invalid');
    } else {
      console.error('[Push] Error sending notification:', err.message);
    }
  }
}

module.exports = { sendPushNotification };
