import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@saas/types';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MonthlyReportsService } from './monthly-reports.service';

type Actor = { id: string; tenantId: string };

const ADMINS = [UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN];
const OWNERS = [UserRole.BUSINESS_OWNER, UserRole.BUSINESS_MODERATOR, UserRole.BUSINESS_ADMIN];

@ApiTags('Monthly reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monthly-reports')
export class MonthlyReportsController {
  constructor(private readonly reports: MonthlyReportsService) {}

  // ── platform admins (literal routes first) ──────────────────────────

  @Roles(...ADMINS)
  @Get('categories')
  @ApiOperation({ summary: 'Categories for the report filter' })
  categories(@CurrentUser() user: Actor) {
    return this.reports.categories(user.tenantId);
  }

  @Roles(...ADMINS)
  @Get('csv')
  @ApiOperation({ summary: 'Monthly report as CSV (platform admins)' })
  async csv(
    @CurrentUser() user: Actor,
    @Res() res: Response,
    @Query('month') month?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const report = await this.reports.build(month, { tenantId: user.tenantId, categoryId });
    return this.send(res, report);
  }

  @Roles(...ADMINS)
  @Get()
  @ApiOperation({ summary: 'Monthly report (platform admins)' })
  report(
    @CurrentUser() user: Actor,
    @Query('month') month?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.reports.build(month, { tenantId: user.tenantId, categoryId });
  }

  // ── a business owner: only their own businesses ─────────────────────

  @Roles(...OWNERS)
  @Get('mine/csv')
  @ApiOperation({ summary: 'My monthly report as CSV' })
  async mineCsv(@CurrentUser() user: Actor, @Res() res: Response, @Query('month') month?: string) {
    const businessIds = await this.reports.businessIdsFor(user.id, user.tenantId);
    const report = await this.reports.build(month, { tenantId: user.tenantId, businessIds });
    return this.send(res, report);
  }

  @Roles(...OWNERS)
  @Get('mine')
  @ApiOperation({ summary: 'My monthly report (business owners)' })
  async mine(@CurrentUser() user: Actor, @Query('month') month?: string) {
    const businessIds = await this.reports.businessIdsFor(user.id, user.tenantId);
    return this.reports.build(month, { tenantId: user.tenantId, businessIds });
  }

  private send(res: Response, report: any) {
    const csv = this.reports.csv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=whtzup-monthly-report-${report.month.key}.csv`,
    );
    return res.status(200).send('\uFEFF' + csv);
  }
}
