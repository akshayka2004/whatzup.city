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
  async findOne(@Param('id') id: string) {
    return this.offersService.findById(id);
  }

  @Public()
  @Get('business/:businessId')
  async findByBusiness(@Param('businessId') businessId: string) {
    return this.offersService.findByBusiness(businessId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  async create(@Body() data: any) {
    return this.offersService.create(data.businessId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() data: any) {
    return this.offersService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/redeem')
  @ApiBearerAuth()
  async redeem(@Param('id') id: string) {
    return this.offersService.redeem(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(@Param('id') id: string) {
    return this.offersService.softDelete(id);
  }
}
