import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create and optionally schedule a campaign' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: CreateCampaignDto,
  ) {
    return this.campaignsService.create(tenantId, adminId, body);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  async list(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.campaignsService.listCampaigns(tenantId, page);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get campaign delivery analytics' })
  async analytics(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.campaignsService.getCampaignAnalytics(tenantId, id);
  }
}
