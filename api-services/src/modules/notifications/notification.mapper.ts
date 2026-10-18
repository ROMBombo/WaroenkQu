import { toIsoJakarta } from '../../common/utils/datetime.util';
import { Notification } from '../../database/entities';
import { NotificationResponseDto } from './dto/notification-response.dto';

export function toNotificationResponse(notification: Notification): NotificationResponseDto {
  return {
    id: notification.id,
    product: { id: notification.product.id, name: notification.product.name },
    catalog_publish_id: notification.catalogPublishId,
    message: notification.message,
    is_read: notification.isRead,
    created_at: toIsoJakarta(notification.createdAt),
    read_at: toIsoJakarta(notification.readAt),
  };
}
