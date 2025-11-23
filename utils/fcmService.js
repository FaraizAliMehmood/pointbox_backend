const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Check if service account key is provided via environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Alternative: Initialize with individual environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('Firebase Admin not initialized. FCM notifications will not work. Please set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_* environment variables.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
  }
}

/**
 * Send FCM notification to a single token
 * @param {string} token - FCM token
 * @param {Object} notification - Notification data
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendNotificationToToken = async (token, notification, data = {}) => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized');
  }

  const message = {
    token,
    notification: {
      title: notification.title || 'Notification',
      body: notification.body || notification.message || '',
    },
    data: {
      ...data,
      title: notification.title || '',
      message: notification.message || notification.body || '',
      type: notification.type || 'general',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    webpush: {
      notification: {
        title: notification.title || 'Notification',
        body: notification.body || notification.message || '',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    // Handle invalid tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'invalid_token', message: error.message };
    }
    throw error;
  }
};

/**
 * Send FCM notification to multiple tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {Object} notification - Notification data
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendNotificationToTokens = async (tokens, notification, data = {}) => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized');
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, message: 'No tokens provided' };
  }

  // Remove duplicates
  const uniqueTokens = [...new Set(tokens)];

  const message = {
    notification: {
      title: notification.title || 'Notification',
      body: notification.body || notification.message || '',
    },
    data: {
      ...data,
      title: notification.title || '',
      message: notification.message || notification.body || '',
      type: notification.type || 'general',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    webpush: {
      notification: {
        title: notification.title || 'Notification',
        body: notification.body || notification.message || '',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      },
    },
    tokens: uniqueTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Clean up invalid tokens
    const invalidTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          if (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(uniqueTokens[idx]);
          }
        }
      });
    }

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Send notification based on device type filter
 * @param {Array} users - Array of user objects with fcmTokens array
 * @param {Object} notification - Notification data
 * @param {string} deviceType - 'mobile', 'web', or 'both'
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendNotificationToUsers = async (users, notification, deviceType = 'both', data = {}) => {
  if (!users || users.length === 0) {
    return { success: false, message: 'No users provided' };
  }

  // Extract tokens based on device type
  const tokens = [];
  const tokenUserMap = new Map(); // Track which token belongs to which user for cleanup

  users.forEach((user) => {
    if (!user.fcmTokens || user.fcmTokens.length === 0) return;

    user.fcmTokens.forEach((fcmTokenObj) => {
      if (deviceType === 'both' || 
          (deviceType === 'mobile' && fcmTokenObj.deviceType === 'mobile') ||
          (deviceType === 'web' && fcmTokenObj.deviceType === 'web')) {
        tokens.push(fcmTokenObj.token);
        if (!tokenUserMap.has(fcmTokenObj.token)) {
          tokenUserMap.set(fcmTokenObj.token, user._id);
        }
      }
    });
  });

  if (tokens.length === 0) {
    return { success: false, message: 'No valid tokens found for the specified device type' };
  }

  const result = await sendNotificationToTokens(tokens, notification, data);

  return {
    ...result,
    totalUsers: users.length,
    tokensUsed: tokens.length,
    tokenUserMap: Object.fromEntries(tokenUserMap),
  };
};

module.exports = {
  sendNotificationToToken,
  sendNotificationToTokens,
  sendNotificationToUsers,
};

