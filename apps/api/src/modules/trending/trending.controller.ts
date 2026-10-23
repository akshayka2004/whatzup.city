import { Controller, Get, Query, Header } from '@nestjs/common';
import { PUBLIC_API_CACHE } from '../../common/http/cache-control';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrendingService } from './trending.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Trending')
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Public()
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get('businesses')
  @ApiOperation({ summary: 'Get trending businesses based on engagement signals (public)' })
  async businesses(@Query('tenantId') tenantId: string = 'default') {
    return this.trendingService.getTrendingBusinesses(tenantId);
  }

  @Public()
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get('offers')
  @ApiOperation({ summary: 'Get trending offers by redemption count (public)' })
  async offers(@Query('tenantId') tenantId: string = 'default') {
    return this.trendingService.getTrendingOffers(tenantId);
  }

  @Public()
  @Header('Cache-Control', PUBLIC_API_CACHE)
  @Get('categories')
  @ApiOperation({ summary: 'Get trending categories by business count (public)' })
  async categories(@Query('tenantId') tenantId: string = 'default') {
    return this.trendingService.getTrendingCategories(tenantId);
  }
}
