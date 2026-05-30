import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CivicService } from './civic.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateCivicProfileDto } from './dto/update-civic-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Civic')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('civic')
export class CivicController {
  constructor(private readonly civicService: CivicService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current civic account profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.civicService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update civic profile details, logo, banner, social links' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCivicProfileDto,
  ) {
    return this.civicService.updateProfile(userId, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change the civic account password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.civicService.changePassword(userId, dto);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get referral count + list (civic accounts only)' })
  async getReferrals(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.civicService.getReferrals(userId, role);
  }
}
