import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrendingService } from './trending.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Trending')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get('businesses')
  @ApiOperation({ summary: 'Get trending businesses based on engagement signals' })
  async businesses(@CurrentUser('tenantId') tenantId: string) {
    return this.trendingService.getTrendingBusinesses(tenantId);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Get trending offers by redemption count' })
  async offers(@CurrentUser('tenantId') tenantId: string) {
    return this.trendingService.getTrendingOffers(tenantId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get trending categories by business count' })
  async categories(@CurrentUser('tenantId') tenantId: string) {
    return this.trendingService.getTrendingCategories(tenantId);
  }
}
