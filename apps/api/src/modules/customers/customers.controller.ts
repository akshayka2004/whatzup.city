import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile with onboarding details' })
  async getMe(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.customersService.getMe(userId, tenantId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update customer profile information' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateMe(userId, tenantId, dto);
  }
}
