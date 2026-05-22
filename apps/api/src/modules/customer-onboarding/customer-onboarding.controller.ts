import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerOnboardingService } from './customer-onboarding.service';
import {
  CustomerSignupDto,
  PreparePhoneVerificationDto,
  ProfileCompletionDto,
} from './dto/customer-signup.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Customer Onboarding')
@Controller('customer-onboarding')
export class CustomerOnboardingController {
  constructor(private readonly onboardingService: CustomerOnboardingService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new customer account (Step 1)' })
  async signup(@Body() dto: CustomerSignupDto) {
    return this.onboardingService.signup(dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify email token to activate account (Step 2)' })
  async verify(@Query('token') token: string) {
    return this.onboardingService.verifyEmail(token);
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete profile information & preferences (Step 3)' })
  async completeProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ProfileCompletionDto,
  ) {
    return this.onboardingService.completeProfile(userId, tenantId, dto);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current customer onboarding step progress' })
  async getProgress(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.onboardingService.getProgress(userId, tenantId);
  }

  @Post('prepare-phone-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Prepare OTP/SMS phone verification for future provider integration' })
  async preparePhoneVerification(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: PreparePhoneVerificationDto,
  ) {
    return this.onboardingService.preparePhoneVerification(userId, tenantId, dto);
  }
}
