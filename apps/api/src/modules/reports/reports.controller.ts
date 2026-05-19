import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() data: any): Promise<any> {
    return this.reportsService.create(userId, data);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  async findAll(@Query('page') page?: number, @Query('status') status?: string): Promise<any> {
    return this.reportsService.findAll(page, 20, status);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('resolution') resolution: string,
  ): Promise<any> {
    return this.reportsService.resolve(id, userId, resolution);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/dismiss')
  async dismiss(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<any> {
    return this.reportsService.dismiss(id, userId);
  }
}
