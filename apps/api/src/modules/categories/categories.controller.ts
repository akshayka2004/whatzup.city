import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@saas/types';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateCategoryDto,
  MergeCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── public ──────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Active categories as a tree (master list)' })
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Public()
  @Get('resolve/:slug')
  @ApiOperation({
    summary: 'Is this slug active, archived, merged (→ target) or gone? For old links.',
  })
  async resolve(@Param('slug') slug: string) {
    return this.categoriesService.resolveSlug(slug);
  }

  // ── super-admin management (MASTER_ADMIN may read, only SUPER_ADMIN may write) ──

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'All categories incl. archived, with listing counts' })
  async adminList() {
    return this.categoriesService.adminList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id/impact')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'What archiving, merging or deleting this category would affect' })
  async impact(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.impact(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('reorder')
  @ApiBearerAuth()
  async reorder(@CurrentUser('id') userId: string, @Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder({ id: userId }, dto.ids);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @ApiBearerAuth()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create({ id: userId }, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update({ id: userId }, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/merge')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Move all businesses and subcategories into another category, then retire this one',
  })
  async merge(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeCategoryDto,
  ) {
    return this.categoriesService.merge({ id: userId }, id, dto.targetId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an unused category (409 with the impact when it is in use)' })
  async remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove({ id: userId }, id);
  }
}
