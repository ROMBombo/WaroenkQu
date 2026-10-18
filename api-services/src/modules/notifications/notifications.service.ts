import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-code.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { Notification } from '../../database/entities';

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly notifications: Repository<Notification>) {}

  async findAll(query: PaginationQueryDto): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
    const [[items, total], unreadCount] = await Promise.all([
      this.notifications.findAndCount({
        relations: { product: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: query.skip,
        take: query.limit,
      }),
      this.notifications.countBy({ isRead: false }),
    ]);
    return { items, total, unreadCount };
  }

  /** Idempotent: notifikasi yang sudah dibaca tetap 200 dan read_at tidak berubah. */
  async markAsRead(id: string): Promise<Notification> {
    await this.notifications
      .createQueryBuilder()
      .update()
      .set({ isRead: true, readAt: () => 'now()' })
      .where('id = :id AND is_read = false', { id })
      .execute();

    const notification = await this.notifications.findOne({ where: { id }, relations: { product: true } });
    if (!notification) {
      throw AppException.notFound(ErrorCode.NOTIFICATION_NOT_FOUND, 'Notifikasi tidak ditemukan');
    }
    return notification;
  }
}
