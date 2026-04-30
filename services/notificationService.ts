import {
  DB_ID,
  ID,
  NOTIFICATIONS_COL_ID,
  Query,
  databases,
} from "../lib/appwrite";
import { AppNotification } from "../types/models";

type NotificationType = "news" | "support" | "goal" | "system" | "recurring";

type CreateNotificationData = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  relatedEntityType?: string;
};

function isSameDay(first?: string, secondDate = new Date()) {
  if (!first) return false;

  const firstDate = new Date(first);

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export async function createNotification(
  data: CreateNotificationData
): Promise<AppNotification> {
  const payload: Record<string, any> = {
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type,
    isRead: false,
  };

  if (data.relatedEntityId) {
    payload.relatedEntityId = data.relatedEntityId;
  }

  if (data.relatedEntityType) {
    payload.relatedEntityType = data.relatedEntityType;
  }

  const created = await databases.createDocument(
    DB_ID,
    NOTIFICATIONS_COL_ID,
    ID.unique(),
    payload
  );

  return created as unknown as AppNotification;
}

export async function getUserNotifications(
  userId: string
): Promise<AppNotification[]> {
  const response = await databases.listDocuments(
    DB_ID,
    NOTIFICATIONS_COL_ID,
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]
  );

  return response.documents as unknown as AppNotification[];
}

export async function getUnreadNotificationsCount(
  userId: string
): Promise<number> {
  const response = await databases.listDocuments(
    DB_ID,
    NOTIFICATIONS_COL_ID,
    [
      Query.equal("userId", userId),
      Query.equal("isRead", false),
      Query.limit(100),
    ]
  );

  return response.documents.length;
}

export async function markNotificationAsRead(notificationId: string) {
  return databases.updateDocument(DB_ID, NOTIFICATIONS_COL_ID, notificationId, {
    isRead: true,
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  const notifications = await getUserNotifications(userId);

  await Promise.all(
    notifications
      .filter((notification) => !notification.isRead)
      .map((notification) => markNotificationAsRead(notification.$id))
  );
}

export async function deleteNotification(notificationId: string) {
  return databases.deleteDocument(
    DB_ID,
    NOTIFICATIONS_COL_ID,
    notificationId
  );
}

/**
 * Создает уведомление только один раз в день.
 * Нужно, чтобы приложение не спамило одинаковыми уведомлениями при каждом открытии.
 */
export async function createUniqueDailyNotification(
  data: CreateNotificationData
) {
  const notifications = await getUserNotifications(data.userId);

  const alreadyExistsToday = notifications.some((notification) => {
    return (
      notification.type === data.type &&
      notification.title === data.title &&
      notification.relatedEntityId === data.relatedEntityId &&
      notification.relatedEntityType === data.relatedEntityType &&
      isSameDay(notification.$createdAt)
    );
  });

  if (alreadyExistsToday) {
    return null;
  }

  return createNotification(data);
}