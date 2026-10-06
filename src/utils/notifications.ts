import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Reminder, Notice } from '../types';

export interface AlertPlugin {
  schedule(options: { title: string; message: string; time: number }): Promise<void>;
  cancel(options: { time: number }): Promise<void>;
}

const Alert = registerPlugin<AlertPlugin>('Alert');

export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  try {
    // Check current status first
    const checkPush = await PushNotifications.checkPermissions();
    const checkLocal = await LocalNotifications.checkPermissions();

    if (checkPush.receive !== 'granted') {
      console.log("📢 Requesting Push Notification permissions...");
      await PushNotifications.requestPermissions();
    }

    if (checkLocal.display !== 'granted') {
      console.log("🔔 Requesting Local Notification permissions...");
      await LocalNotifications.requestPermissions();
    }

    const finalStatus = await PushNotifications.checkPermissions();
    return finalStatus.receive;
  } catch (e) {
    console.error("Permission request failed:", e);
    return 'denied';
  }
}

export async function showNoticeNotification(notice: Notice) {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notice.title, { body: notice.description });
    }
    return;
  }

  // Create channel for high priority (with sound)
  await LocalNotifications.createChannel({
    id: 'notices',
    name: 'Official Notices',
    description: 'Alerts for new transport updates',
    importance: 5,
    visibility: 1,
    sound: 'notification.mp3'
  });

  await LocalNotifications.schedule({
    notifications: [
      {
        title: `📢 ${notice.title}`,
        body: notice.description,
        id: Math.abs((notice.id).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'notification.mp3',
        actionTypeId: 'OPEN_NOTICE',
        extra: { noticeId: notice.id },
        channelId: 'notices'
      }
    ]
  });
}

export async function scheduleLocalNotification(reminder: Reminder) {
  if (!Capacitor.isNativePlatform()) return;

  // Parse time "08:15 am"
  const [timePart, modifier] = reminder.busTime.toLowerCase().split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  
  if (modifier === 'pm' && hours < 12) hours += 12;
  if (modifier === 'am' && hours === 12) hours = 0;

  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours);
  scheduledTime.setMinutes(minutes - reminder.minutesBefore);
  scheduledTime.setSeconds(0);
  scheduledTime.setMilliseconds(0);

  // If time is in the past, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // Use the native Alert plugin for 100% reliability and persistent countdown
  try {
    await Alert.schedule({
      title: reminder.routeName,
      message: `${reminder.direction}: Bus departs at ${reminder.busTime}`,
      time: scheduledTime.getTime()
    });
  } catch (err) {
    console.error('Failed to schedule alert via native plugin:', err);

    // Fallback to Capacitor LocalNotifications if native plugin fails
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Bus Leaving Soon! 🚌',
          body: `${reminder.direction}: ${reminder.routeName} departs at ${reminder.busTime}`,
          id: Math.abs((reminder.id).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
          schedule: { at: new Date(scheduledTime.getTime() - (reminder.minutesBefore * 60000)) },
          channelId: 'bus-alarms'
        }
      ]
    });
  }
}

export async function cancelNotification(reminderId: string, busTime?: string) {
  if (!Capacitor.isNativePlatform()) return;
  
  // Attempt to cancel via native plugin if we have the time
  if (busTime) {
     const [timePart, modifier] = busTime.toLowerCase().split(' ');
     let [hours, minutes] = timePart.split(':').map(Number);
     if (modifier === 'pm' && hours < 12) hours += 12;
     if (modifier === 'am' && hours === 12) hours = 0;
     const scheduledTime = new Date();
     scheduledTime.setHours(hours, minutes, 0, 0);
     if (scheduledTime < new Date()) scheduledTime.setDate(scheduledTime.getDate() + 1);

     await Alert.cancel({ time: scheduledTime.getTime() });
  }

  const id = Math.abs((reminderId).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0));
  await LocalNotifications.cancel({
    notifications: [{ id }]
  });
}
