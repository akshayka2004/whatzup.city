import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Public()
  @Get()
  async findActive(@Query('tenantId') tenantId: string = 'default', @Query('page') page?: number) {
    return this.offersService.findActive(tenantId, page, 20, true);
  }

  // ── Super-admin: platform-wide offers (all tenants) ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  async adminAll(@Query('page') page?: number) {
    return this.offersService.findAllForAdmin(page);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
  @Delete('admin/:id')
  @ApiBearerAuth()
  async adminRemove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.offersService.adminDelete(id, adminId);
  }

  @Public()
  @Get(':id')
  async findOne(@Query('tenantId') tenantId: string = 'default', @Param('id') id: string) {
    return this.offersService.findById(tenantId, id, true);
  }

  @Public()
  @Get('business/:businessId')
  async findByBusiness(
    @Query('tenantId') tenantId: string = 'default',
    @Param('businessId') businessId: string,
  ) {
    return this.offersService.findByBusiness(tenantId, businessId, true);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/:businessId')
  @ApiBearerAuth()
  async findMyOffers(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.offersService.findByBusiness(tenantId, businessId, false);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.offersService.create(tenantId, userId, data.businessId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.offersService.update(tenantId, id, userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/redeem')
  @ApiBearerAuth()
  async redeem(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.offersService.redeem(tenantId, id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.offersService.softDelete(tenantId, id, userId);
  }
}
