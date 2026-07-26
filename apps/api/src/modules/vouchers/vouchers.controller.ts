import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto, UpdateVoucherDto, RedeemVoucherDto } from './dto/voucher.dto';

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  // ── OWNER ──────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Create a voucher (business owner)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateVoucherDto) {
    return this.vouchers.create(userId, dto.businessId, dto);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a customer voucher code in-store (owner/staff)' })
  redeem(@CurrentUser('id') userId: string, @Body() dto: RedeemVoucherDto) {
    return this.vouchers.redeem(userId, dto.businessId, dto.code);
  }

  @Get('mine/:businessId')
  @ApiOperation({ summary: "Owner's vouchers for a business" })
  mine(@CurrentUser('id') userId: string, @Param('businessId') businessId: string) {
    return this.vouchers.listForBusiness(userId, businessId);
  }

  // ── CUSTOMER ───────────────────────────────────────────────────────────
  @Get('available/:businessId')
  @ApiOperation({ summary: "Business vouchers with the viewer's unlock state + spend progress" })
  available(@CurrentUser('id') userId: string, @Param('businessId') businessId: string) {
    return this.vouchers.available(businessId, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'My unlocked vouchers (wallet)' })
  my(@CurrentUser('id') userId: string) {
    return this.vouchers.myVouchers(userId);
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: 'Unlock a voucher code once spend threshold is met' })
  unlock(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vouchers.unlock(userId, id);
  }

  @Get(':id/claims')
  @ApiOperation({ summary: 'Claims for a voucher (owner)' })
  claims(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vouchers.listClaims(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher (owner)' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchers.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a voucher (owner)' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vouchers.remove(userId, id);
  }
}
