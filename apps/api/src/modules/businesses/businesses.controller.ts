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
    return this.businessesService.findAll(tenantId, {
      page,
      limit,
      categoryId,
      city,
      search,
      status: 'APPROVED',
    });
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
    return this.businessesService.getNearby(tenantId, lat, lng, radius);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get business by ID (public)' })
  async findOne(@Param('id') id: string) {
    return this.businessesService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new business' })
  async create(@CurrentUser() user: any, @Body() data: any) {
    return this.businessesService.create(user.tenantId, user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my businesses' })
  async getMyBusinesses(@CurrentUser('id') userId: string) {
    return this.businessesService.getOwnerBusinesses(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business details' })
  async update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() data: any) {
    return this.businessesService.update(id, userId, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business status (admin)' })
  async updateStatus(@Param('id') id: string, @Body('status') status: BusinessStatus) {
    return this.businessesService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending approvals (admin)' })
  async getPending(@CurrentUser('tenantId') tenantId: string) {
    return this.businessesService.findAll(tenantId, { status: 'PENDING' });
  }
}
