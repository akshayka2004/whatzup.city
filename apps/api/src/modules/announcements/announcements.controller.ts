import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { PUBLIC_API_CACHE } from '../../common/http/cache-control';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';
import { AnnouncementDto } from './dto/announcement.dto';
import { DatabaseService } from '../../common/database/database.service';
import { assertOwnsAnnouncement, assertVerifiedPublisher } from '../../common/utils/publisher';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly db: DatabaseService,
  ) {}

  @Public()
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get()
  async findPublished(
    @Query('tenantId') tenantId: string = 'default',
    @Query('page') page?: number,
    @Query('city') city?: string,
  ): Promise<any> {
    return this.announcementsService.findPublished(tenantId, page, 20, city);
  }

  @Public()
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return this.announcementsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GOVERNMENT_ADMIN, UserRole.MASTER_ADMIN)
  @Post()
  @ApiBearerAuth()
  async create(@CurrentUser() user: any, @Body() data: AnnouncementDto): Promise<any> {
    await assertVerifiedPublisher(this.db, user);
    return this.announcementsService.create(user.tenantId, user.id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GOVERNMENT_ADMIN, UserRole.MASTER_ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: AnnouncementDto,
  ): Promise<any> {
    await assertVerifiedPublisher(this.db, user);
    await assertOwnsAnnouncement(this.db, id, user);
    return this.announcementsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GOVERNMENT_ADMIN, UserRole.MASTER_ADMIN)
  @Patch(':id/publish')
  @ApiBearerAuth()
  async publish(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    await assertVerifiedPublisher(this.db, user);
    await assertOwnsAnnouncement(this.db, id, user);
    return this.announcementsService.publish(id);
  }
}
