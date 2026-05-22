import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@saas/types';
import { Response } from 'express';
import { CreateReportDto, ResolveReportDto } from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() data: CreateReportDto): Promise<any> {
    return this.reportsService.create(userId, data);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  async findAll(@Query('page') page?: number, @Query('status') status?: string): Promise<any> {
    return this.reportsService.findAll(page, 20, status);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('exports/business-kpi')
  @ApiOperation({ summary: 'Export business KPI performance reports as CSV' })
  async exportBusinessKPIs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days: number,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportBusinessKPIReport(
      tenantId,
      days ? Number(days) : undefined,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=business-kpis-${Date.now()}.csv`);
    return res.status(200).send(csv);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('exports/fraud')
  @ApiOperation({ summary: 'Export platform fraud flag lists as CSV' })
  async exportFraudFlags(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days: number,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportFraudReport(
      tenantId,
      days ? Number(days) : undefined,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=fraud-report-${Date.now()}.csv`);
    return res.status(200).send(csv);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ResolveReportDto,
  ): Promise<any> {
    return this.reportsService.resolve(id, userId, dto.resolution);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @Patch(':id/dismiss')
  async dismiss(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<any> {
    return this.reportsService.dismiss(id, userId);
  }
}
