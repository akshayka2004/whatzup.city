import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.usersService.findById(id, currentUser.id, currentUser.role);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { name?: string; phone?: string; avatar?: string },
  ) {
    return this.usersService.update(userId, data);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a user (admin only)' })
  async remove(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { message: 'User deactivated' };
  }
}
