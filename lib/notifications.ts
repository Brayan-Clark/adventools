import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting } from './user-storage';

// Configure notification behavior when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize notification channel on Android (must be called at app startup)
 */
export async function initializeNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
      });
      console.log('Notification channel initialized successfully');
    } catch (err) {
      console.error('Failed to initialize notification channel:', err);
    }
  }
}

/**
 * Requests native notification permissions from the system.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.error('Failed to request notification permission', e);
    return false;
  }
}

/**
 * Schedules a daily recurring notification at the specified time minus the lead minutes.
 */
export async function scheduleStudyReminder(
  enabled: boolean,
  timeStr: string,
  leadMinutes: number,
  language: string
): Promise<void> {
  try {
    // 1. Cancel all existing study reminder notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('study_reminder_')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    console.error('Error canceling old reminders:', err);
  }

  if (!enabled) {
    console.log('Study reminders are disabled. Not scheduling new reminders.');
    return;
  }

  // 2. Request/Verify permissions
  const granted = await requestNotificationPermissions();
  if (!granted) {
    console.warn('Cannot schedule notification: permission not granted.');
    return;
  }

  // 3. Parse and calculate reminder time
  const [hourStr, minStr] = timeStr.split(':');
  let exactHour = parseInt(hourStr, 10);
  let exactMinute = parseInt(minStr, 10);

  if (isNaN(exactHour) || isNaN(exactMinute)) {
    exactHour = 7;
    exactMinute = 0;
  }

  const lowerLang = language.toLowerCase();

  // 4. Exact time notification texts
  let exactTitle = "Fianarana ny Lesona 📖";
  let exactBody = "Fotoana hianarana ny lesona Sekoly Sabata androany!";
  
  if (lowerLang.includes('français') || lowerLang.includes('french')) {
    exactTitle = "C'est l'heure d'étudier ! 📖";
    exactBody = "Prenez quelques minutes pour étudier votre leçon de l'École du Sabbat aujourd'hui !";
  } else if (lowerLang.includes('anglais') || lowerLang.includes('english')) {
    exactTitle = "Time to Study! 📖";
    exactBody = "Take a few minutes to study your Sabbath School lesson today!";
  }

  // 5. Schedule local recurring notification for EXACT time
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    const triggerType = Platform.OS === 'android' 
      ? Notifications.SchedulableTriggerInputTypes.DAILY
      : Notifications.SchedulableTriggerInputTypes.CALENDAR;

    await Notifications.scheduleNotificationAsync({
      identifier: `study_reminder_exact_${exactHour}_${exactMinute}`,
      content: {
        title: exactTitle,
        body: exactBody,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          screen: 'sabbath-school',
          url: '/utiles/lesona',
        },
      },
      trigger: Platform.OS === 'android' 
        ? {
            type: triggerType,
            channelId: 'study-reminders',
            hour: exactHour,
            minute: exactMinute,
          }
        : {
            type: triggerType,
            hour: exactHour,
            minute: exactMinute,
            repeats: true,
          },
    });

    console.log(`Exact study reminder scheduled daily at ${exactHour}:${exactMinute}`);

    // 6. Schedule Lead time notification if needed
    if (leadMinutes > 0) {
      let totalMinutes = exactHour * 60 + exactMinute - leadMinutes;
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60; // wrap to previous day
      }
      const leadHour = Math.floor(totalMinutes / 60) % 24;
      const leadMinute = totalMinutes % 60;

      let leadTitle = "Miomana hianatra 📖";
      let leadBody = `Afaka ${leadMinutes} minitra dia fotoana hianaranao ny lesona Sekoly Sabata. Miomana ary!`;
      
      if (lowerLang.includes('français') || lowerLang.includes('french')) {
        leadTitle = "Préparez-vous à étudier ! 📖";
        leadBody = `Dans ${leadMinutes} minutes, commence votre moment d'étude de la leçon de l'École du Sabbat. Préparez-vous !`;
      } else if (lowerLang.includes('anglais') || lowerLang.includes('english')) {
        leadTitle = "Get ready to study! 📖";
        leadBody = `In ${leadMinutes} minutes, it's time for your Sabbath School lesson study. Get ready!`;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: `study_reminder_lead_${leadHour}_${leadMinute}`,
        content: {
          title: leadTitle,
          body: leadBody,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            screen: 'sabbath-school',
            url: '/utiles/lesona',
          },
        },
        trigger: Platform.OS === 'android' 
          ? {
              type: triggerType,
              channelId: 'study-reminders',
              hour: leadHour,
              minute: leadMinute,
            }
          : {
              type: triggerType,
              hour: leadHour,
              minute: leadMinute,
              repeats: true,
            },
      });
      console.log(`Lead study reminder scheduled daily at ${leadHour}:${leadMinute}`);
    }
    
    // Verify the notification was scheduled
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Total scheduled notifications: ${scheduled.length}`);
  } catch (err) {
    console.error('Failed to schedule local notification', err);
  }
}

/**
 * Restores study reminders from saved settings on app startup.
 * This is needed because scheduled notifications are lost after app rebuild.
 */
export async function restoreStudyReminders(): Promise<void> {
  try {
    const enabled = await getSetting<boolean>('studyReminderEnabled', false);
    const timeStr = await getSetting<string>('studyReminderTime', '07:00');
    const leadMinutes = await getSetting<number>('studyReminderLeadMinutes', 0);
    const language = await getSetting<string>('language', 'Français');

    if (enabled) {
      console.log('Restoring study reminders from settings...');
      await scheduleStudyReminder(enabled, timeStr, leadMinutes, language);
    }
  } catch (err) {
    console.error('Failed to restore study reminders:', err);
  }
}
