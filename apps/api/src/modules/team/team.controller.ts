import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Business Team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('businesses/:businessId/team')
  @ApiOperation({ summary: 'List team members of a business (accepts business.id OR entity.id)' })
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.teamService.listMembers(tenantId, businessId, userId);
  }

  @Post('businesses/:businessId/team')
  @ApiOperation({ summary: 'Create a team member account (admin sets credentials)' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
    @Body() data: { name: string; email: string; password: string; role: any; phone?: string },
  ) {
    return this.teamService.createMember(tenantId, businessId, userId, data);
  }

  @Delete('team/:staffId')
  @ApiOperation({ summary: 'Remove a team member (soft-delete BusinessStaff record)' })
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.teamService.removeMember(tenantId, staffId, userId);
  }
}
