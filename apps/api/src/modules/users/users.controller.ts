import { Controller, Get, Patch, Delete, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId, userId);
  }

  @Get()
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  async findAll(
    @CurrentUser() currentUser: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(
      currentUser.tenantId,
      { page, limit, role },
      currentUser.role,
    );
  }

  @Get('admin/all-registrations')
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all platform registrations with full details (super-admin)' })
  async allRegistrations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.usersService.findAllRegistrations({ page, limit, role, search, tenantId, sortBy, sortOrder });
  }

  @Get('tenant/registrations')
  @ApiOperation({ summary: 'List registrations scoped to current tenant (business admins)' })
  async tenantRegistrations(
    @CurrentUser() currentUser: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllRegistrations({
      page,
      limit,
      role,
      search,
      tenantId: currentUser.tenantId,
    });
  }

  // NOTE: literal GET routes MUST be declared before the `:id` param route —
  // NestJS matches in declaration order, so `:id` would otherwise swallow
  // e.g. `/users/referral-leaderboard` (→ findById('referral-leaderboard')).
  @Get('referral-leaderboard')
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Top referrers leaderboard (admin only)' })
  async referralLeaderboard(@CurrentUser() currentUser: any) {
    return this.usersService.getReferralLeaderboard(currentUser.tenantId);
  }

  @Get(':id')
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.usersService.findById(id, currentUser.id, currentUser.role);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own account (self-service)' })
  async deleteSelf(@CurrentUser('id') userId: string) {
    await this.usersService.deleteSelf(userId);
    return { message: 'Account deleted' };
  }

  @Get('me/referrals')
  @ApiOperation({ summary: 'Get referral stats for current user' })
  async myReferrals(@CurrentUser('id') userId: string) {
    return this.usersService.getReferralStats(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { name?: string; phone?: string; avatar?: string; profession?: string },
  ) {
    return this.usersService.update(userId, data);
  }

  @Patch('admin/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super-admin: edit any user account' })
  async adminUpdate(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() data: any,
  ) {
    return this.usersService.adminUpdate(id, adminId, data);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (requires current password)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() data: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(userId, data);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a user (admin only)' })
  async remove(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { message: 'User deactivated' };
  }

  @Post('admin/create')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin creates a Portal Admin or Master Admin account' })
  async createAdmin(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { name: string; email: string; password: string; role: 'MASTER_ADMIN' | 'PORTAL_ADMIN' },
  ) {
    return this.usersService.createAdminUser(tenantId, body);
  }

  @Get('admin/list')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all portal admin accounts' })
  async listAdmins(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.listAdminUsers(tenantId);
  }
}
