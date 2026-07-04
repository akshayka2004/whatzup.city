import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GovernmentAlertsService } from './government-alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('Government Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('government-alerts')
export class GovernmentAlertsController {
  constructor(private readonly alertsService: GovernmentAlertsService) {}

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.GOVERNMENT_ADMIN,
    UserRole.NGO_ADMIN,
    UserRole.COMMUNITY_ADMIN,
    UserRole.NEWS_FORUM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Create a civic / government alert' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: CreateAlertDto,
  ) {
    return this.alertsService.create(tenantId, adminId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get published government alerts' })
  async getPublished(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.alertsService.getPublished(tenantId, page);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Track alert view' })
  async trackView(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    await this.alertsService.incrementViewCount(tenantId, id);
    return { tracked: true };
  }

  // Platform admins delete any notice; civic / government owners delete only
  // their own (enforced in the service WHERE clause).
  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.GOVERNMENT_ADMIN,
    UserRole.NGO_ADMIN,
    UserRole.COMMUNITY_ADMIN,
    UserRole.NEWS_FORUM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a civic / government notice' })
  async remove(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.alertsService.remove(id, userId, tenantId, role);
  }
}
