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
  language: string,
  forceRecreate: boolean = true
): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    // If not enabled, just cancel and return
    if (!enabled) {
      for (const notif of scheduled) {
        if (notif.identifier.startsWith('study_reminder_')) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
      console.log('Study reminders are disabled. Cancelled all old reminders.');
      return;
    }

    // Parse time
    const [hourStr, minStr] = timeStr.split(':');
    let exactHour = parseInt(hourStr, 10);
    let exactMinute = parseInt(minStr, 10);
    if (isNaN(exactHour) || isNaN(exactMinute)) {
      exactHour = 7;
      exactMinute = 0;
    }

    const exactIdentifier = `study_reminder_exact_${exactHour}_${exactMinute}`;
    let expectedIdentifiers = [exactIdentifier];

    let leadHour = exactHour;
    let leadMinute = exactMinute;
    let leadIdentifier = '';
    const numericLead = Number(leadMinutes);

    if (numericLead > 0) {
      let totalMinutes = exactHour * 60 + exactMinute - numericLead;
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60; // wrap to previous day
      }
      leadHour = Math.floor(totalMinutes / 60) % 24;
      leadMinute = totalMinutes % 60;
      leadIdentifier = `study_reminder_lead_${leadHour}_${leadMinute}`;
      expectedIdentifiers.push(leadIdentifier);
    }

    // Check if we need to recreate
    if (!forceRecreate) {
      const existingIdentifiers = scheduled.map(n => n.identifier);
      const hasAllExpected = expectedIdentifiers.every(id => existingIdentifiers.includes(id));
      if (hasAllExpected) {
         console.log('Reminders already properly scheduled. Skipping recreation.');
         return;
      }
    }

    // First cancel old ones
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('study_reminder_')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Request permissions
    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.warn('Cannot schedule notification: permission not granted.');
      return;
    }

    // Setup channel
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

    // Language texts
    const lowerLang = language.toLowerCase();
    let exactTitle = "Fianarana ny Lesona 📖";
    let exactBody = "Fotoana hianarana ny lesona Sekoly Sabata androany!";
    if (lowerLang.includes('français') || lowerLang.includes('french')) {
      exactTitle = "C'est l'heure d'étudier ! 📖";
      exactBody = "Prenez quelques minutes pour étudier votre leçon de l'École du Sabbat aujourd'hui !";
    } else if (lowerLang.includes('anglais') || lowerLang.includes('english')) {
      exactTitle = "Time to Study! 📖";
      exactBody = "Take a few minutes to study your Sabbath School lesson today!";
    }

    // Schedule EXACT
    await Notifications.scheduleNotificationAsync({
      identifier: exactIdentifier,
      content: {
        title: exactTitle,
        body: exactBody,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { screen: 'sabbath-school', url: '/utiles/lesona' },
      },
      trigger: {
        hour: exactHour,
        minute: exactMinute,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'study-reminders' : undefined,
      },
    });
    console.log(`Exact study reminder scheduled daily at ${exactHour}:${exactMinute}`);

    // Schedule LEAD
    if (numericLead > 0) {
      let leadTitle = "Miomana hianatra 📖";
      let leadBody = `Afaka ${numericLead} minitra dia fotoana hianaranao ny lesona Sekoly Sabata. Miomana ary!`;
      if (lowerLang.includes('français') || lowerLang.includes('french')) {
        leadTitle = "Préparez-vous à étudier ! 📖";
        leadBody = `Dans ${numericLead} minutes, commence votre moment d'étude de la leçon de l'École du Sabbat. Préparez-vous !`;
      } else if (lowerLang.includes('anglais') || lowerLang.includes('english')) {
        leadTitle = "Get ready to study! 📖";
        leadBody = `In ${numericLead} minutes, it's time for your Sabbath School lesson study. Get ready!`;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: leadIdentifier,
        content: {
          title: leadTitle,
          body: leadBody,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { screen: 'sabbath-school', url: '/utiles/lesona' },
        },
        trigger: {
          hour: leadHour,
          minute: leadMinute,
          repeats: true,
          channelId: Platform.OS === 'android' ? 'study-reminders' : undefined,
        },
      });
      console.log(`Lead study reminder scheduled daily at ${leadHour}:${leadMinute}`);
    }

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
      await scheduleStudyReminder(enabled, timeStr, leadMinutes, language, false);
    }
  } catch (err) {
    console.error('Failed to restore study reminders:', err);
  }
}
