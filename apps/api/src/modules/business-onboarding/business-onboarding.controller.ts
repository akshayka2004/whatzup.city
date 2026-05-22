import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessOnboardingService } from './business-onboarding.service';
import {
  StartBusinessOnboardingDto,
  UpdateBusinessDetailsDto,
} from './dto/business-onboarding.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Business Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-onboarding')
export class BusinessOnboardingController {
  constructor(private readonly onboardingService: BusinessOnboardingService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start business onboarding draft creation (Step 1)' })
  async startOnboarding(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: StartBusinessOnboardingDto,
  ) {
    return this.onboardingService.startOnboarding(userId, tenantId, dto);
  }

  @Put(':id/step/:step')
  @ApiOperation({ summary: 'Update business step information details (Steps 2-5)' })
  async updateStep(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Param('step', ParseIntPipe) step: number,
    @Body() dto: UpdateBusinessDetailsDto,
  ) {
    return this.onboardingService.updateStep(userId, tenantId, id, step, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Final check and submit onboarding for admin verification' })
  async submit(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.onboardingService.submitForVerification(userId, tenantId, id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get draft progress metrics' })
  async getProgress(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.onboardingService.getProgress(userId, tenantId, id);
  }
}
