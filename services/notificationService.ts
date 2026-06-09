import { Platform } from "react-native";

const SUBSCRIPTION_CHANNEL_ID = "subscription-reminders";
const DEFAULT_REMINDER_DAYS_BEFORE = 3;
const DEFAULT_REMINDER_TIME = "12:00";

export interface NotificationPermissionState {
  canAskAgain?: boolean;
  granted: boolean;
  status: string;
  supported: boolean;
}

export interface SubscriptionReminderScheduleInput {
  amountLabel?: string;
  dayOfMonth: number;
  reminderDaysBefore?: number | null;
  reminderTime?: string | null;
  subscriptionId: string;
  subscriptionName: string;
}

export function getSubscriptionReminderIdentifier(subscriptionId: string): string {
  return `subscription-reminder:${subscriptionId}`;
}

export async function configureNotificationRuntime(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(SUBSCRIPTION_CHANNEL_ID, {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: "订阅提醒"
    });
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") {
    return { granted: false, status: "unsupported", supported: false };
  }

  const Notifications = await import("expo-notifications");
  const permission = await Notifications.getPermissionsAsync();

  return {
    canAskAgain: permission.canAskAgain,
    granted: permission.granted,
    status: permission.status,
    supported: true
  };
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const current = await getNotificationPermissionState();
  if (current.granted) {
    await configureNotificationRuntime();
    return true;
  }

  if (current.canAskAgain === false) {
    return false;
  }

  const Notifications = await import("expo-notifications");
  const requested = await Notifications.requestPermissionsAsync();

  if (requested.granted) {
    await configureNotificationRuntime();
  }

  return requested.granted;
}

export async function scheduleSubscriptionReminder(
  input: SubscriptionReminderScheduleInput
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return null;
  }

  validateReminderInput(input);
  const Notifications = await import("expo-notifications");
  const { hour, minute } = parseReminderTime(input.reminderTime ?? DEFAULT_REMINDER_TIME);
  const reminderDaysBefore = input.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS_BEFORE;
  const reminderDay = Math.max(1, input.dayOfMonth - reminderDaysBefore);
  const amountText = input.amountLabel ? `，金额 ${input.amountLabel}` : "";

  return Notifications.scheduleNotificationAsync({
    identifier: getSubscriptionReminderIdentifier(input.subscriptionId),
    content: {
      body: `${input.subscriptionName} 将在本月 ${input.dayOfMonth} 日生成账单${amountText}`,
      data: {
        kind: "subscription-reminder",
        subscriptionId: input.subscriptionId
      },
      sound: false,
      title: "订阅提醒"
    },
    trigger: {
      channelId: SUBSCRIPTION_CHANNEL_ID,
      day: reminderDay,
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY
    }
  });
}

export async function cancelSubscriptionReminder(subscriptionId: string): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const Notifications = await import("expo-notifications");
  await Notifications.cancelScheduledNotificationAsync(getSubscriptionReminderIdentifier(subscriptionId));
}

function validateReminderInput(input: SubscriptionReminderScheduleInput): void {
  if (!input.subscriptionId.trim()) {
    throw new Error("Subscription id is required");
  }

  if (!input.subscriptionName.trim()) {
    throw new Error("Subscription name is required");
  }

  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    throw new Error("Subscription dayOfMonth must be between 1 and 28");
  }

  const reminderDaysBefore = input.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS_BEFORE;

  if (reminderDaysBefore < 0 || reminderDaysBefore > 28) {
    throw new Error("Subscription reminderDaysBefore must be between 0 and 28");
  }

  parseReminderTime(input.reminderTime ?? DEFAULT_REMINDER_TIME);
}

function parseReminderTime(value: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new Error("Subscription reminderTime must use HH:mm format");
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}
