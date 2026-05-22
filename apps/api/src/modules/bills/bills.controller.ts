import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new bill for verification' })
  async upload(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      businessId: string;
      amount: number;
      billDate: string;
      billImage: string;
      description?: string;
    },
  ) {
    return this.billsService.upload(tenantId, userId, body);
  }

  @Get('my-bills')
  @ApiOperation({ summary: 'Get bills uploaded by current user' })
  async getMyBills(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
  ) {
    return this.billsService.findByUser(tenantId, userId, page);
  }
}
