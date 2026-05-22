import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeregisterDeviceDto } from './dto/deregister-device.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification feed for current user' })
  async getNotifications(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.findByUser(tenantId, userId, page, limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get cached unread notification count' })
  async getUnreadCount(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(tenantId, userId);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markAsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, userId, id);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Post('register-device')
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  async registerDevice(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: RegisterDeviceDto,
  ) {
    const device = await this.notificationsService.registerDeviceToken(tenantId, userId, {
      deviceToken: body.token,
      deviceType: body.deviceType,
      os: body.os,
      browser: body.browser,
      ipAddress: body.ipAddress,
    });
    return { registered: true, deviceId: device.id };
  }

  @Post('deregister-device')
  @ApiOperation({ summary: 'Remove a device token from push service' })
  async deregisterDevice(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: DeregisterDeviceDto,
  ) {
    return this.notificationsService.deregisterDeviceToken(tenantId, body.token);
  }
}
