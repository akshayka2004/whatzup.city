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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, BusinessStatus } from '@saas/types';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List businesses (public)' })
  async findAll(
    @Query('tenantId') tenantId: string = 'default',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    return this.businessesService.findAll(
      tenantId,
      {
        page,
        limit,
        categoryId,
        city,
        search,
      },
      true,
    );
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby businesses' })
  async findNearby(
    @Query('tenantId') tenantId: string = 'default',
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.businessesService.getNearby(tenantId, lat, lng, radius, true);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my businesses' })
  async getMyBusinesses(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.businessesService.getOwnerBusinesses(tenantId, userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get business by ID (public)' })
  async findOne(@Query('tenantId') tenantId: string = 'default', @Param('id') id: string) {
    return this.businessesService.findById(tenantId, id, true);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new business' })
  async create(@CurrentUser() user: any, @Body() data: any) {
    return this.businessesService.create(user.tenantId, user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business details' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.businessesService.update(tenantId, id, userId, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all businesses across tenants (super-admin)' })
  async adminAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.businessesService.adminFindAll(page, limit, search);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit any business profile (super-admin)' })
  async adminUpdate(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() data: any,
  ) {
    return this.businessesService.adminUpdate(id, adminId, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business status (admin)' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
    @Body('status') status: BusinessStatus,
  ) {
    return this.businessesService.updateStatus(tenantId, id, status, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending approvals (admin)' })
  async getPending(@CurrentUser('tenantId') tenantId: string) {
    return this.businessesService.findAll(tenantId, {
      status: BusinessStatus.PENDING_VERIFICATION,
    });
  }

  // ── Tag endpoints ──────────────────────────────────────────

  @Public()
  @Get('search/by-tag')
  @ApiOperation({ summary: 'Search businesses by tag keyword (public)' })
  async searchByTag(
    @Query('tenantId') tenantId: string = 'default',
    @Query('tag') tag: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.businessesService.searchByTag(tenantId, tag || '', page, limit);
  }

  @Public()
  @Get(':id/tags')
  @ApiOperation({ summary: 'Get tags for a business (public)' })
  async getTags(
    @Query('tenantId') tenantId: string = 'default',
    @Param('id') businessId: string,
  ) {
    return this.businessesService.getTags(tenantId, businessId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/tags')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set tags for a business (owner)' })
  async setTags(
    @Param('id') businessId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body('tags') tags: string[],
  ) {
    return this.businessesService.setTags(tenantId, businessId, userId, tags || []);
  }
}
