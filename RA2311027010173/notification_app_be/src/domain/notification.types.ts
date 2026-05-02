export enum NotificationType {
  Placement = "Placement",
  Event = "Event",
  Result = "Result"
}

export interface NotificationRecord {
  id: string;
  studentId: string;
  notificationType: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationPayload {
  studentId: string;
  notificationType: NotificationType;
  message: string;
}

export interface NotificationCount {
  studentId: string;
  unreadCount: number;
}

export class NotificationHttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface PriorityNotification extends NotificationRecord {
  priorityWeight: number;
}
