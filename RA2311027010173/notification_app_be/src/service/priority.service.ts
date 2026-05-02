import type { NotificationRecord, PriorityNotification } from "../domain/notification.types";
import { NotificationType } from "../domain/notification.types";

const priorityWeights: Record<NotificationType, number> = {
  [NotificationType.Placement]: 3,
  [NotificationType.Result]: 2,
  [NotificationType.Event]: 1
};

export function rankPriorityInbox(unreadShelf: NotificationRecord[], limit = 10): PriorityNotification[] {
  return [...unreadShelf]
    .map((notificationCard) => ({
      ...notificationCard,
      priorityWeight: priorityWeights[notificationCard.notificationType] ?? 0
    }))
    .sort((leftCard, rightCard) => {
      if (rightCard.priorityWeight !== leftCard.priorityWeight) {
        return rightCard.priorityWeight - leftCard.priorityWeight;
      }

      return new Date(rightCard.createdAt).getTime() - new Date(leftCard.createdAt).getTime();
    })
    .slice(0, limit);
}
