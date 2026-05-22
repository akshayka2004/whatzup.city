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
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('business/:businessId')
  async findByBusiness(
    @Query('tenantId') tenantId: string = 'default',
    @Param('businessId') businessId: string,
    @Query('page') page?: number,
  ) {
    return this.productsService.findByBusiness(tenantId, businessId, page);
  }

  @Public()
  @Get(':id')
  async findOne(@Query('tenantId') tenantId: string = 'default', @Param('id') id: string) {
    return this.productsService.findById(tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.productsService.create(tenantId, userId, data.businessId, data);
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
    return this.productsService.update(tenantId, id, userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.softDelete(tenantId, id, userId);
  }
}
