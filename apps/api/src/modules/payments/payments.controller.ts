import { Controller, Get, Post, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@saas/types';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('businesses/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit payment transaction details' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(userId, tenantId, businessId, dto);
  }

  @Get('businesses/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment records for a business' })
  async get(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.paymentsService.getPayments(userId, tenantId, businessId);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin verification of subscription payment transaction (Admin only)' })
  async verify(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.verifyPayment(adminId, tenantId, paymentId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay payment webhooks listener endpoint' })
  async webhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return this.paymentsService.handleWebhookPlaceholder(body, signature);
  }
}

@ApiTags('Business Payments')
@Controller('businesses')
export class BusinessPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit payment transaction details for business onboarding' })
  async createForBusiness(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(userId, tenantId, businessId, dto);
  }

  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business payment records' })
  async getForBusiness(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') businessId: string,
  ) {
    return this.paymentsService.getPayments(userId, tenantId, businessId);
  }
}
