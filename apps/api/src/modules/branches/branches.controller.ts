import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Business Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('businesses/:businessId/branches')
  @ApiOperation({ summary: 'List branches of a business (accepts business.id OR entity.id)' })
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.branchesService.findByBusiness(tenantId, businessId, userId);
  }

  @Post('businesses/:businessId/branches')
  @ApiOperation({ summary: 'Create a new branch for a business' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.branchesService.create(tenantId, businessId, userId, data);
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Update branch details' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.branchesService.update(tenantId, id, userId, data);
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Soft-delete a branch' })
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.branchesService.remove(tenantId, id, userId);
  }

  @Get('branches/:id/performance')
  @ApiOperation({ summary: 'Get analytics performance data for a branch' })
  async performance(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('days') days?: number,
  ) {
    return this.branchesService.getPerformance(tenantId, id, userId, days ? Number(days) : 30);
  }
}
