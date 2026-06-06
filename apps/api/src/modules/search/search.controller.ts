import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Search & Discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('discover')
  @Public()
  @ApiOperation({ summary: 'Discover approved businesses platform-wide with filters' })
  async discover(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('minRating') minRating?: number,
    @Query('page') page?: number,
    @Query('tenantId') tenantId?: string,
  ) {
    // Public discovery: search APPROVED businesses across ALL tenants (each
    // business registers its own tenant), not just the caller's tenant.
    return this.searchService.searchBusinesses(
      tenantId || 'default',
      q || '*',
      { categoryId, city, minRating },
      page,
      20,
      true, // isPublic — cross-tenant, APPROVED only
    );
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Discover nearby businesses using Geo-Search' })
  async nearby(
    @CurrentUser('tenantId') tenantId: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 10,
    @Query('page') page?: number,
  ) {
    return this.searchService.nearbyBusinesses(tenantId, lat, lng, radius, page);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending businesses and offers' })
  async trending(@CurrentUser('tenantId') tenantId: string) {
    return this.searchService.getTrending(tenantId);
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get recommended businesses for current user' })
  async recommended(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.searchService.getRecommendations(tenantId, userId);
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Type-ahead suggestions after 2+ characters' })
  @ApiQuery({ name: 'q', required: true, description: 'Search prefix (min 2 chars)' })
  @ApiQuery({ name: 'tenantId', required: false })
  async suggestions(
    @Query('q') q: string,
    @Query('tenantId') tenantId?: string,
    @CurrentUser('tenantId') userTenantId?: string,
  ) {
    const tid = userTenantId || tenantId || 'default';
    return this.searchService.getSuggestions(tid, q || '');
  }
}
