import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LaunchInterestsService } from './launch-interests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@saas/types';

@ApiTags('Launch Interests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('launch-interests')
export class LaunchInterestsController {
  constructor(private readonly service: LaunchInterestsService) {}

  @Get('stats')
  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_OWNER,
    UserRole.BUSINESS_ADMIN,
    UserRole.BUSINESS_MODERATOR,
  )
  @ApiOperation({ summary: 'Counts for both pre-launch interest tables' })
  getStats() {
    return this.service.getStats();
  }

  @Get('businesses')
  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_OWNER,
    UserRole.BUSINESS_ADMIN,
    UserRole.BUSINESS_MODERATOR,
  )
  @ApiOperation({ summary: 'List launch_business_interests (paginated)' })
  findBusinesses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findBusinesses({ page, limit, search });
  }

  @Get('individuals')
  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_OWNER,
    UserRole.BUSINESS_ADMIN,
    UserRole.BUSINESS_MODERATOR,
  )
  @ApiOperation({ summary: 'List launch_individual_interests (paginated)' })
  findIndividuals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findIndividuals({ page, limit, search });
  }
}
