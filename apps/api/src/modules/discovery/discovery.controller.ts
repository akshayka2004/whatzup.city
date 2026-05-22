import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discover')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('homepage')
  @ApiOperation({ summary: 'Get curated homepage feed with top-rated, new, and featured content' })
  async homepage(@CurrentUser('tenantId') tenantId: string) {
    return this.discoveryService.getHomepageFeed(tenantId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all active categories with business counts' })
  async categories(@CurrentUser('tenantId') tenantId: string) {
    return this.discoveryService.getCategories(tenantId);
  }

  @Get('categories/:categoryId')
  @ApiOperation({ summary: 'Get businesses within a specific category' })
  async categoryBusinesses(
    @CurrentUser('tenantId') tenantId: string,
    @Param('categoryId') categoryId: string,
    @Query('page') page?: number,
  ) {
    return this.discoveryService.getCategoryWithBusinesses(tenantId, categoryId, page);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Get currently active offers' })
  async offers(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.discoveryService.getActiveOffers(tenantId, page);
  }
}
