import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "journal_reminder";
const NOTIFICATION_ID_KEY = "journal_reminder_id";

/**
 * Configures how notifications are presented while the app is in the foreground.
 * Call once at app startup (before showing any notification).
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permission. Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Schedules a repeating daily journal reminder at the given hour:minute (24h).
 * Cancels any existing reminder first so there is at most one scheduled.
 *
 * @param hour   - 0–23
 * @param minute - 0–59
 * @param name   - User's name for personalised copy (optional)
 */
export async function scheduleJournalReminder(
  hour: number,
  minute: number,
  name?: string,
): Promise<void> {
  // Cancel existing reminder before scheduling a new one.
  await cancelJournalReminder();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Daily Reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
    });
  }

  const greeting = name?.trim() ? `Hey ${name.trim().split(" ")[0]},` : "Hey,";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to trace.",
      body: `${greeting} take a moment to log your day.`,
      ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Cancels all scheduled journal reminders.
 */
export async function cancelJournalReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Format 24h hour + minute as a readable string, e.g. "9:00 PM" */
export function formatReminderTime(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, "0");
  return `${h}:${m} ${period}`;
}
