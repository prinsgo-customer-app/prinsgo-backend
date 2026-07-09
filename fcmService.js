// Sends a push notification via Firebase Cloud Messaging legacy HTTP API
const sendFcmNotification = async (fcmToken, title, message) => {
  if (!process.env.FCM_SERVER_KEY) {
    console.log(`[DEV FCM] To: ${fcmToken} | ${title}: ${message}`);
    return { success: true };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${process.env.FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: { title, body: message },
      }),
    });
    const data = await response.json();
    return { success: data.success === 1, data };
  } catch (error) {
    console.error('FCM send error:', error.message);
    return { success: false, error: error.message };
  }
};

// Send to many tokens, returns counts of successes/failures
const sendFcmBulk = async (tokens, title, message) => {
  let sentCount = 0;
  let failedCount = 0;

  for (const token of tokens) {
    if (!token) {
      failedCount += 1;
      continue;
    }
    const result = await sendFcmNotification(token, title, message);
    if (result.success) sentCount += 1;
    else failedCount += 1;
  }

  return { sentCount, failedCount };
};

module.exports = { sendFcmNotification, sendFcmBulk };
