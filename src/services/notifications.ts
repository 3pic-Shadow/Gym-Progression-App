import { Platform } from 'react-native';

import type { NotificationTiming } from '@/src/models';

const REST_NOTIFICATION_ID = 'gym-timer-rest-complete';

interface RestNotificationInput {
  enabled: boolean;
  restEndsAt: number;
  timing: NotificationTiming;
  title: string;
  message: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const NOTIFICATION_LEAD_MILLISECONDS: Record<NotificationTiming, number> = {
  'five-seconds': 5000,
  'ten-seconds': 10000,
  'rest-complete': 0,
};

let notificationQueue: Promise<void> = Promise.resolve();
let localNotificationsApi: ReturnType<typeof loadLocalNotificationsApi> | null = null;

function loadLocalNotificationsApi() {
  // The package index initializes remote push registration, which is unavailable in Expo Go.
  return Promise.all([
    import('expo-notifications/build/cancelScheduledNotificationAsync'),
    import('expo-notifications/build/scheduleNotificationAsync'),
    import('expo-notifications/build/setNotificationChannelAsync'),
    import('expo-notifications/build/NotificationPermissions'),
    import('expo-notifications/build/NotificationChannelManager.types'),
    import('expo-notifications/build/Notifications.types'),
  ]).then(
    ([cancelModule, scheduleModule, channelModule, permissionsModule, channelTypes, triggerTypes]) => ({
      cancelScheduledNotificationAsync: cancelModule.default,
      scheduleNotificationAsync: scheduleModule.default,
      setNotificationChannelAsync: channelModule.default,
      getPermissionsAsync: permissionsModule.getPermissionsAsync,
      requestPermissionsAsync: permissionsModule.requestPermissionsAsync,
      AndroidImportance: channelTypes.AndroidImportance,
      SchedulableTriggerInputTypes: triggerTypes.SchedulableTriggerInputTypes,
    })
  );
}

function getLocalNotificationsApi() {
  localNotificationsApi ??= loadLocalNotificationsApi();
  return localNotificationsApi;
}

async function replaceRestNotification(input: RestNotificationInput | null) {
  if (Platform.OS === 'web') {
    return;
  }

  const Notifications = await getLocalNotificationsApi();

  await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID).catch(() => undefined);

  const notificationTime = input
    ? input.restEndsAt - NOTIFICATION_LEAD_MILLISECONDS[input.timing]
    : 0;

  if (!input?.enabled || notificationTime <= Date.now()) {
    return;
  }

  const channelId = `rest-${input.soundEnabled ? 'sound' : 'silent'}-${
    input.vibrationEnabled ? 'vibrate' : 'still'
  }`;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Rest timer',
      description: 'Alerts when a workout rest period is nearly complete.',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: input.vibrationEnabled,
      vibrationPattern: input.vibrationEnabled ? [0, 250, 150, 250] : null,
      sound: input.soundEnabled ? 'default' : null,
      showBadge: false,
    });
  }

  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: REST_NOTIFICATION_ID,
    content: {
      title: input.title,
      body: input.message,
      sound: input.soundEnabled ? 'default' : false,
      data: { kind: 'rest-complete' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notificationTime,
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });
}

export function syncRestNotification(input: RestNotificationInput | null) {
  notificationQueue = notificationQueue
    .then(() => replaceRestNotification(input))
    .catch((error) => {
      console.warn('Unable to update the rest notification', error);
    });

  return notificationQueue;
}

export async function previewRestNotification(title: string, message: string) {
  if (Platform.OS === 'web') {
    throw new Error('Notifications are only available in an installed mobile build');
  }

  const Notifications = await getLocalNotificationsApi();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    throw new Error('Notification permission was not granted');
  }

  const channelId = 'rest-preview';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Rest timer previews',
      description: 'Preview notifications for the rest timer.',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
      showBadge: false,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      sound: 'default',
      data: { kind: 'rest-preview' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: Date.now() + 1500,
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });
}
