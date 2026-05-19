import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Public()
  @Get()
  async findPublished(
    @Query('tenantId') tenantId: string = 'default',
    @Query('page') page?: number,
  ): Promise<any> {
    return this.announcementsService.findPublished(tenantId, page);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return this.announcementsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GOVERNMENT_AGENCY, UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  async create(@CurrentUser() user: any, @Body() data: any): Promise<any> {
    return this.announcementsService.create(user.tenantId, user.id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GOVERNMENT_AGENCY, UserRole.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() data: any): Promise<any> {
    return this.announcementsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GOVERNMENT_AGENCY, UserRole.ADMIN)
  @Patch(':id/publish')
  @ApiBearerAuth()
  async publish(@Param('id') id: string): Promise<any> {
    return this.announcementsService.publish(id);
  }
}
