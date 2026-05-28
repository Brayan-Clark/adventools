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

const CHANNEL_ID = 'study-reminders';

/**
 * Initialize notification channel on Android (must be called at app startup)
 */
export async function initializeNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rappels d\'étude',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
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
 * Schedules a DAILY notification at the given local time.
 * Uses type:'daily' to fire at the device's local time, every day.
 *
 * @param enabled       Whether reminders are enabled
 * @param timeStr       HH:MM string (device local time)
 * @param leadMinutes   Minutes before exactTime for the warning notification (0 = no warning)
 * @param language      User language for notification text
 * @param forceRecreate Force cancellation and re-scheduling even if already scheduled
 */
export async function scheduleStudyReminder(
  enabled: boolean,
  timeStr: string,
  leadMinutes: number,
  language: string,
  forceRecreate: boolean = true
): Promise<void> {
  try {
    // ── Cancel existing reminders ────────────────────────────────────────────
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingIds = scheduled
      .filter(n => n.identifier.startsWith('study_reminder_'))
      .map(n => n.identifier);

    if (!enabled) {
      for (const id of existingIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      console.log('Study reminders disabled — all cancelled.');
      return;
    }

    // ── Parse exact time ─────────────────────────────────────────────────────
    const [hourStr, minStr] = (timeStr || '07:00').split(':');
    let exactHour = parseInt(hourStr, 10);
    let exactMinute = parseInt(minStr, 10);
    if (isNaN(exactHour) || exactHour < 0 || exactHour > 23) exactHour = 7;
    if (isNaN(exactMinute) || exactMinute < 0 || exactMinute > 59) exactMinute = 0;

    const numericLead = Math.max(0, Number(leadMinutes) || 0);

    // ── Compute lead time ────────────────────────────────────────────────────
    let leadHour = 0;
    let leadMinute = 0;
    const hasLead = numericLead > 0;
    if (hasLead) {
      let totalMinutes = exactHour * 60 + exactMinute - numericLead;
      if (totalMinutes < 0) totalMinutes += 24 * 60; // wrap to previous day
      leadHour = Math.floor(totalMinutes / 60) % 24;
      leadMinute = totalMinutes % 60;
    }

    // ── Build expected identifiers ───────────────────────────────────────────
    const exactIdentifier = `study_reminder_exact_${exactHour}_${exactMinute}`;
    const leadIdentifier = hasLead
      ? `study_reminder_lead_${leadHour}_${leadMinute}`
      : '';
    const expectedIds = hasLead
      ? [exactIdentifier, leadIdentifier]
      : [exactIdentifier];

    // ── Skip recreation if already properly scheduled ────────────────────────
    if (!forceRecreate) {
      const alreadyOk = expectedIds.every(id => existingIds.includes(id));
      if (alreadyOk && existingIds.length === expectedIds.length) {
        console.log('Reminders already properly scheduled. Skipping recreation.');
        return;
      }
    }

    // ── Cancel ALL old study reminders before scheduling new ones ────────────
    for (const id of existingIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }

    // ── Request permissions ──────────────────────────────────────────────────
    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.warn('Cannot schedule notification: permission not granted.');
      return;
    }

    // ── Ensure channel exists (Android) ──────────────────────────────────────
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rappels d\'étude',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    // ── Build language-specific texts ─────────────────────────────────────────
    const lowerLang = language.toLowerCase();
    const isFr = lowerLang.includes('français') || lowerLang.includes('french');
    const isEn = lowerLang.includes('anglais') || lowerLang.includes('english');

    let exactTitle: string;
    let exactBody: string;
    let leadTitle: string;
    let leadBody: string;

    if (isFr) {
      exactTitle = "C'est l'heure d'étudier ! 📖";
      exactBody = "Prenez quelques minutes pour étudier votre leçon de l'École du Sabbat aujourd'hui !";
      leadTitle = "Préparez-vous à étudier ! 📖";
      leadBody = `Dans ${numericLead} minute${numericLead > 1 ? 's' : ''}, ce sera votre moment d'étude de la leçon de l'École du Sabbat. Préparez-vous !`;
    } else if (isEn) {
      exactTitle = "Time to Study! 📖";
      exactBody = "Take a few minutes to study your Sabbath School lesson today!";
      leadTitle = "Get ready to study! 📖";
      leadBody = `In ${numericLead} minute${numericLead > 1 ? 's' : ''}, it's time for your Sabbath School lesson study. Get ready!`;
    } else {
      exactTitle = "Fianarana ny Lesona 📖";
      exactBody = "Fotoana hianarana ny lesona Sekoly Sabata androany!";
      leadTitle = "Miomana hianatra 📖";
      leadBody = `Afaka ${numericLead} minitra dia fotoana hianaranao ny lesona Sekoly Sabata. Miomana ary!`;
    }

    // ── Schedule EXACT daily reminder ─────────────────────────────────────────
    //   'daily' trigger fires at the given local-time hour:minute every day.
    //   It will NOT fire until the NEXT occurrence of that time (no immediate fire).
    await Notifications.scheduleNotificationAsync({
      identifier: exactIdentifier,
      content: {
        title: exactTitle,
        body: exactBody,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { screen: 'sabbath-school', url: '/utiles/lesona' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: exactHour,
        minute: exactMinute,
      } as any,
    });
    console.log(`✅ Exact reminder scheduled daily at ${exactHour.toString().padStart(2, '0')}:${exactMinute.toString().padStart(2, '0')} (local time)`);

    // ── Schedule LEAD (warning) reminder ──────────────────────────────────────
    if (hasLead) {
      await Notifications.scheduleNotificationAsync({
        identifier: leadIdentifier,
        content: {
          title: leadTitle,
          body: leadBody,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { screen: 'sabbath-school', url: '/utiles/lesona' },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: leadHour,
          minute: leadMinute,
        } as any,
      });
      console.log(`✅ Lead reminder scheduled daily at ${leadHour.toString().padStart(2, '0')}:${leadMinute.toString().padStart(2, '0')} (local time, ${numericLead}min before)`);
    }

  } catch (err) {
    console.error('Failed to schedule study notification:', err);
    throw err; // re-throw so caller can handle it
  }
}

/**
 * Restores study reminders from saved settings on app startup.
 * This is needed because scheduled notifications are sometimes lost after app rebuild.
 */
export async function restoreStudyReminders(): Promise<void> {
  try {
    const enabled = await getSetting<boolean>('studyReminderEnabled', false);
    const timeStr = await getSetting<string>('studyReminderTime', '07:00');
    const leadMinutes = await getSetting<number>('studyReminderLeadMinutes', 0);
    const language = await getSetting<string>('language', 'Français');

    if (enabled) {
      console.log(`Restoring study reminders: ${timeStr}, lead=${leadMinutes}min`);
      await scheduleStudyReminder(enabled, timeStr, leadMinutes, language, false);
    }
  } catch (err) {
    console.error('Failed to restore study reminders:', err);
  }
}
