import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VouchersService, type Actor } from './vouchers.service';
import { RewardInsightsService } from './reward-insights.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  RedeemVoucherDto,
  LookupVoucherDto,
  AudiencePreviewDto,
} from './dto/voucher.dto';

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(
    private readonly vouchers: VouchersService,
    private readonly insights: RewardInsightsService,
  ) {}

  // ── OWNER / MANAGER ────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Create a reward (owner, moderator)' })
  create(@CurrentUser() user: Actor, @Body() dto: CreateVoucherDto) {
    return this.vouchers.create(user, dto.businessId, dto);
  }

  @Post('audience/preview')
  @ApiOperation({ summary: 'How many customers fit an audience (rounded, never names)' })
  audiencePreview(@CurrentUser() user: Actor, @Body() dto: AudiencePreviewDto) {
    return this.vouchers.audiencePreview(user, dto.businessId, dto.audience);
  }

  @Get('mine/:businessId')
  @ApiOperation({ summary: 'A business rewards with claim counts' })
  mine(@CurrentUser() user: Actor, @Param('businessId') businessId: string) {
    return this.vouchers.listForBusiness(user, businessId);
  }

  @Get('insights/:businessId')
  @ApiOperation({ summary: 'Reward funnel, customers and revenue insights for a business' })
  insightsFor(
    @CurrentUser() user: Actor,
    @Param('businessId') businessId: string,
    @Query('days') days?: string,
  ) {
    return this.insights.forBusiness(user, businessId, Number(days) || 30);
  }

  // ── STAFF (any active staff of the business) ───────────────────────────
  @Post('lookup')
  @Throttle({ long: { limit: 40, ttl: 60000 } })
  @ApiOperation({ summary: 'Check a customer code before redeeming it' })
  lookup(@CurrentUser() user: Actor, @Body() dto: LookupVoucherDto) {
    return this.vouchers.lookup(user, dto.businessId, dto.code);
  }

  @Post('redeem')
  @Throttle({ long: { limit: 40, ttl: 60000 } })
  @ApiOperation({ summary: 'Redeem a customer reward code at the counter' })
  redeem(@CurrentUser() user: Actor, @Body() dto: RedeemVoucherDto) {
    return this.vouchers.redeem(user, dto.businessId, dto.code, { billAmount: dto.billAmount });
  }

  // ── CUSTOMER ───────────────────────────────────────────────────────────
  @Get('available/:businessId')
  @ApiOperation({ summary: 'Business rewards with the viewer progress' })
  available(@CurrentUser('id') userId: string, @Param('businessId') businessId: string) {
    return this.vouchers.available(businessId, userId);
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Ready to claim, almost there, and my codes' })
  wallet(@CurrentUser('id') userId: string) {
    return this.vouchers.wallet(userId);
  }

  @Get('near-me')
  @ApiOperation({ summary: 'Rewards near you that you fit, closest first' })
  nearMe(@CurrentUser('id') userId: string, @Query('city') city?: string) {
    return this.vouchers.nearMe(userId, city);
  }

  @Get('my')
  @ApiOperation({ summary: 'My claimed codes' })
  my(@CurrentUser('id') userId: string) {
    return this.vouchers.myVouchers(userId);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim a reward once the spend is reached' })
  claim(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vouchers.claim(userId, id);
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: 'Same as claim (older name)' })
  unlock(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.vouchers.unlock(userId, id);
  }

  @Get(':id/claims')
  @ApiOperation({ summary: 'Claims for a reward (owner, moderator)' })
  claims(@CurrentUser() user: Actor, @Param('id') id: string) {
    return this.vouchers.listClaims(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reward (owner, moderator)' })
  update(@CurrentUser() user: Actor, @Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchers.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reward with no open codes (owner, moderator)' })
  remove(@CurrentUser() user: Actor, @Param('id') id: string) {
    return this.vouchers.remove(user, id);
  }
}
