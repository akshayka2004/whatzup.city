import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards } from '@nestjs/common';
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

  @Patch('team/:staffId')
  @ApiOperation({ summary: 'Update a team member (name, email, phone, role)' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('staffId') staffId: string,
    @Body() data: { name?: string; email?: string; phone?: string; role?: any },
  ) {
    return this.teamService.updateMember(tenantId, staffId, userId, data);
  }

  @Patch('team/:staffId/toggle')
  @ApiOperation({ summary: 'Enable or disable a team member account' })
  async toggle(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('staffId') staffId: string,
    @Body() body: { enable: boolean },
  ) {
    return this.teamService.toggleMember(tenantId, staffId, userId, body.enable);
  }

  @Post('team/:staffId/reset-password')
  @ApiOperation({ summary: 'Reset a team member password' })
  async resetPassword(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('staffId') staffId: string,
    @Body() body: { password: string },
  ) {
    return this.teamService.resetMemberPassword(tenantId, staffId, userId, body.password);
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
