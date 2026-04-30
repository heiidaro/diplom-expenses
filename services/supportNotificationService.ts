import { getUserSupportTickets } from "./supportService";
import {
  createNotification,
  getUserNotifications,
} from "./notificationService";

export async function syncSupportReplyNotifications(userId: string) {
  const [tickets, notifications] = await Promise.all([
    getUserSupportTickets(userId),
    getUserNotifications(userId),
  ]);

  const ticketsWithReplies = tickets.filter((ticket) => {
    return Boolean(ticket.adminReply?.trim());
  });

  await Promise.all(
    ticketsWithReplies.map(async (ticket) => {
      const alreadyHasNotification = notifications.some((notification) => {
        return (
          notification.type === "support" &&
          notification.relatedEntityId === ticket.$id
        );
      });

      if (alreadyHasNotification) {
        return;
      }

      await createNotification({
        userId,
        title: "Получен ответ поддержки",
        message: `По обращению "${ticket.title}" появился ответ администратора.`,
        type: "support",
        relatedEntityId: ticket.$id,
        relatedEntityType: "support",
      });
    })
  );
}