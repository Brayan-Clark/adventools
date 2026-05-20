import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    hour = 7;
    minute = 0;
  }

  // Calculate target time subtracting lead minutes
  if (leadMinutes > 0) {
    let totalMinutes = hour * 60 + minute - leadMinutes;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // wrap to previous day
    }
    hour = Math.floor(totalMinutes / 60) % 24;
    minute = totalMinutes % 60;
  }

  // 4. Configure language-specific notification texts
  let title = "Fianarana ny Lesona 📖";
  let body = "Makà minitra vitsy hianarana ny lesona Sekoly Sabata androany!";
  
  const lowerLang = language.toLowerCase();
  if (lowerLang.includes('français') || lowerLang.includes('french')) {
    title = "C'est l'heure d'étudier ! 📖";
    body = leadMinutes > 0 
      ? `Dans ${leadMinutes} minutes, commence votre moment d'étude de la leçon de l'École du Sabbat. Préparez-vous !`
      : "Prenez quelques minutes pour étudier votre leçon de l'École du Sabbat aujourd'hui !";
  } else if (lowerLang.includes('anglais') || lowerLang.includes('english')) {
    title = "Time to Study! 📖";
    body = leadMinutes > 0
      ? `In ${leadMinutes} minutes, it's time for your Sabbath School lesson study. Get ready!`
      : "Take a few minutes to study your Sabbath School lesson today!";
  } else {
    // Default to Malagasy
    title = "Fianarana ny Lesona 📖";
    body = leadMinutes > 0
      ? `Afaka ${leadMinutes} minitra dia fotoana hianaranao ny lesona Sekoly Sabata. Miomana ary!`
      : "Makà minitra vitsy hianarana ny lesona Sekoly Sabata androany!";
  }

  // 5. Schedule local recurring notification
  try {
    const identifier = `study_reminder_${hour}_${minute}`;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('study-reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: Platform.OS === 'android' 
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            repeats: true,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            repeats: true,
          },
    });

    console.log(`Study reminder scheduled daily at ${hour}:${minute} (raw time: ${timeStr}, minus ${leadMinutes} min lead)`);
  } catch (err) {
    console.error('Failed to schedule local notification', err);
  }
}
