import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List movies (optionally by city/status)' })
  async findPublic(
    @Query('city') city?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
  ) {
    return this.moviesService.findPublic(city, status, page);
  }

  // ── Super-admin CRUD (declared before :id to avoid capture) ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  async adminAll(@Query('page') page?: number) {
    return this.moviesService.adminFindAll(page);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin')
  @ApiBearerAuth()
  async adminCreate(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: any,
  ) {
    return this.moviesService.adminCreate(userId, tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/:id')
  @ApiBearerAuth()
  async adminUpdate(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: any) {
    return this.moviesService.adminUpdate(id, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Delete('admin/:id')
  @ApiBearerAuth()
  async adminRemove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.moviesService.adminRemove(id, userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get one movie' })
  async findOne(@Param('id') id: string) {
    return this.moviesService.findById(id);
  }
}
