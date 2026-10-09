import { Controller, Get, Query, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessCustomerService } from './business-customer.service';
import { DatabaseService } from '../../common/database/database.service';
import { assertBusinessAccess } from '../../common/utils/business-access';

@ApiTags('Business Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BusinessCustomerController {
  constructor(
    private readonly svc: BusinessCustomerService,
    private readonly db: DatabaseService,
  ) {}

  @Get('businesses/:businessId/customers')
  @ApiOperation({ summary: 'List CRM customers for a business with filters and search' })
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'all|claimed|redeemed|active_month|new_month|repeat|high_engagement|branch|referral',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.svc.listBusinessCustomers(tenantId, businessId, {
      filter,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('businesses/:businessId/customers/export')
  @ApiOperation({ summary: 'Download the filtered customer list as CSV (max 10,000 rows)' })
  async exportCustomers(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
    @Res() res: Response,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    const csv = await this.svc.exportCsv(businessId, filter, search);
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customers-${(filter || 'all').replace(/[^a-z_]/gi, '')}-${day}.csv"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(csv);
  }

  @Get('businesses/:businessId/customers/stats')
  @ApiOperation({ summary: 'Customer analytics stats for a business' })
  async getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    await assertBusinessAccess(this.db, businessId, user);
    return this.svc.getCustomerStats(tenantId, businessId);
  }
}
