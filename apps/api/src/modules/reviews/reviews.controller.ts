import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@saas/types';

import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('business/:businessId')
  async findByBusiness(@Param('businessId') businessId: string, @Query('page') page?: number) {
    return this.reviewsService.findByBusiness(businessId, page);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  async create(@CurrentUser('id') userId: string, @Body() data: CreateReviewDto) {
    return this.reviewsService.create(userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/helpful')
  @ApiBearerAuth()
  async markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @Patch(':id/status')
  @ApiBearerAuth()
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.reviewsService.updateStatus(id, status);
  }
}
