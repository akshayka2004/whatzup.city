import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@saas/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateStaffDto, ResetStaffPasswordDto, UpdateStaffDto } from './dto/staff-account.dto';
import { StaffAccountsService } from './staff-accounts.service';

/** Super admin only: create and manage admin-portal accounts and their access. */
@ApiTags('Staff accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/staff')
export class StaffAccountsController {
  constructor(private readonly staff: StaffAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List super admin, portal admin and staff accounts with their access' })
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.staff.list(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a staff or portal admin account with chosen access' })
  create(@CurrentUser() actor: { id: string; tenantId: string }, @Body() dto: CreateStaffDto) {
    return this.staff.create(actor, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change name, role, access or active state' })
  update(
    @CurrentUser() actor: { id: string; tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(actor, id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new temporary password; the person must change it at sign-in' })
  resetPassword(
    @CurrentUser() actor: { id: string; tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetStaffPasswordDto,
  ) {
    return this.staff.resetPassword(actor, id, dto.password);
  }
}
