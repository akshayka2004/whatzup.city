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
import { ProductDto } from './dto/product.dto';
import { DatabaseService } from '../../common/database/database.service';
import {
  assertBusinessAccess,
  assertResourceAccess,
  type AccessUser,
} from '../../common/utils/business-access';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly db: DatabaseService,
  ) {}

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
    @Body() data: ProductDto,
    @CurrentUser() user: AccessUser,
  ) {
    await assertBusinessAccess(this.db, data.businessId || '', user);
    return this.productsService.create(tenantId, userId, data.businessId || '', data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: ProductDto,
    @CurrentUser() user: AccessUser,
  ) {
    await assertResourceAccess(this.db, 'product', id, user);
    return this.productsService.update(tenantId, id, userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessUser,
  ) {
    await assertResourceAccess(this.db, 'product', id, user);
    return this.productsService.softDelete(tenantId, id, userId);
  }
}
