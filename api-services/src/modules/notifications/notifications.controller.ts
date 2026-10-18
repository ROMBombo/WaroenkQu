import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionCode } from '../../common/constants/permission-code.enum';
import { ApiErrorResponses, ApiProtected } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiDataResponse, ApiResponseBody, ok } from '../../common/dto/api-response';
import { PaginationQueryDto, paginationMeta } from '../../common/dto/pagination.dto';
import { uuidPipe } from '../../common/pipes/validation.pipe';
import { NotificationListMetaDto, NotificationResponseDto } from './dto/notification-response.dto';
import { toNotificationResponse } from './notification.mapper';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications (Owner)')
@ApiProtected()
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(PermissionCode.NOTIFICATION_READ)
  @ApiOperation({ summary: 'List notifikasi beserta jumlah yang belum dibaca' })
  @ApiErrorResponses('VALIDATION_ERROR')
  @ApiDataResponse(NotificationResponseDto, { isArray: true, meta: NotificationListMetaDto })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<ApiResponseBody<NotificationResponseDto[], NotificationListMetaDto>> {
    const { items, total, unreadCount } = await this.notificationsService.findAll(query);
    return ok(items.map(toNotificationResponse), { ...paginationMeta(query, total), unread_count: unreadCount });
  }

  @Patch(':id/read')
  @RequirePermissions(PermissionCode.NOTIFICATION_UPDATE)
  @ApiOperation({ summary: 'Menandai notifikasi sebagai sudah dibaca' })
  @ApiErrorResponses('INVALID_UUID', 'NOTIFICATION_NOT_FOUND')
  @ApiDataResponse(NotificationResponseDto)
  async markAsRead(@Param('id', uuidPipe) id: string): Promise<ApiResponseBody<NotificationResponseDto>> {
    return ok(toNotificationResponse(await this.notificationsService.markAsRead(id)));
  }
}
