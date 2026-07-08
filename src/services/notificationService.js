import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api from './api';

/**
 * notificationService — Expo push registration + in-app notification API.
 *
 * Backend: /api/notifications (register-token, list, mark read).
 * Delivery uses the Expo push service (see server utils/pushService.js).
 */

// Foreground behaviour — show banner + play sound even when app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let cachedToken = null;

/**
 * Ask permission, get the Expo push token, and register it with the backend.
 * Safe to call on every login — backend dedupes by token. Returns the token
 * or null (simulator / denied / not a device).
 */
export const registerForPush = async () => {
  try {
    if (!Device.isDevice) return null; // push tokens only work on real devices

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    cachedToken = token;

    await api.post('/notifications/register-token', {
      token,
      platform: Platform.OS,
    });

    return token;
  } catch (error) {
    console.error('registerForPush failed:', error?.message);
    return null;
  }
};

// Remove this device's token (call on logout).
export const unregisterPush = async () => {
  try {
    if (!cachedToken) return;
    await api.post('/notifications/unregister-token', { token: cachedToken });
    cachedToken = null;
  } catch (error) {
    // best-effort
  }
};

export const notificationApi = {
  list: async (page = 1, limit = 20) => {
    const res = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return res.data; // { notifications, unreadCount, page, hasMore }
  },
  unreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data; // { unreadCount }
  },
  markRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },
};
