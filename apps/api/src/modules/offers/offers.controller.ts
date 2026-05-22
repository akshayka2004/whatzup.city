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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Public()
  @Get()
  async findActive(@Query('tenantId') tenantId: string = 'default', @Query('page') page?: number) {
    return this.offersService.findActive(tenantId, page);
  }

  @Public()
  @Get(':id')
  async findOne(@Query('tenantId') tenantId: string = 'default', @Param('id') id: string) {
    return this.offersService.findById(tenantId, id);
  }

  @Public()
  @Get('business/:businessId')
  async findByBusiness(
    @Query('tenantId') tenantId: string = 'default',
    @Param('businessId') businessId: string,
  ) {
    return this.offersService.findByBusiness(tenantId, businessId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.offersService.create(tenantId, userId, data.businessId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.offersService.update(tenantId, id, userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/redeem')
  @ApiBearerAuth()
  async redeem(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.offersService.redeem(tenantId, id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.offersService.softDelete(tenantId, id, userId);
  }
}
