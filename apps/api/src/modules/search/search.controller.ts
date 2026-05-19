import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(
    @Query('q') query: string,
    @Query('tenantId') tenantId: string = 'default',
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('minRating') minRating?: number,
    @Query('page') page?: number,
  ): Promise<any> {
    return this.searchService.searchBusinesses(
      tenantId,
      query,
      { categoryId, city, minRating },
      page,
    );
  }
}
