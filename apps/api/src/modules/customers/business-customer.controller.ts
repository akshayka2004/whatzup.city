import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessCustomerService } from './business-customer.service';

@ApiTags('Business Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BusinessCustomerController {
  constructor(private readonly svc: BusinessCustomerService) {}

  @Get('businesses/:businessId/customers')
  @ApiOperation({ summary: 'List CRM customers for a business with filters and search' })
  @ApiQuery({ name: 'filter', required: false, description: 'all|claimed|redeemed|active_month|new_month|repeat|high_engagement|branch|referral' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listBusinessCustomers(tenantId, businessId, {
      filter,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('businesses/:businessId/customers/stats')
  @ApiOperation({ summary: 'Customer analytics stats for a business' })
  async getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.svc.getCustomerStats(tenantId, businessId);
  }
}
