import { apiClient } from "./client";

export interface NotificationSettings {
  courseUpdates: boolean;
  enrollmentConfirmations: boolean;
  marketingEmails: boolean;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await apiClient.get<NotificationSettings>("/notification-settings");
  return data;
}

export async function updateNotificationSettings(
  patch: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const { data } = await apiClient.patch<NotificationSettings>("/notification-settings", patch);
  return data;
}