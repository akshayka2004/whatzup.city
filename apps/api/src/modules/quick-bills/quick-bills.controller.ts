import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuickBillsService, type QuickActor } from './quick-bills.service';
import { DecideQuickBillDto, EnterQuickBillDto } from './quick-bills.dto';

@ApiTags('Quick pay')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quick-bills')
export class QuickBillsController {
  constructor(private readonly quick: QuickBillsService) {}

  // Literal routes first, then the ones with a parameter.

  @Post('open')
  @Throttle({ long: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Customer: get a 6-digit code to read out at the counter' })
  open(@CurrentUser() user: QuickActor) {
    return this.quick.open(user);
  }

  @Post('enter')
  @Throttle({ long: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Staff: enter the customer code and the bill amount' })
  enter(@CurrentUser() user: QuickActor, @Body() dto: EnterQuickBillDto) {
    return this.quick.enter(user, dto);
  }

  @Get('recent/:businessId')
  @ApiOperation({ summary: 'Owner: recent Quick pay bills with who entered them' })
  recent(@CurrentUser() user: QuickActor, @Param('businessId') businessId: string) {
    return this.quick.recent(user, businessId);
  }

  @Get('staff/:businessId/:id')
  @ApiOperation({ summary: 'Staff: has the customer confirmed yet?' })
  staffStatus(
    @CurrentUser() user: QuickActor,
    @Param('businessId') businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quick.staffStatus(user, businessId, id);
  }

  @Post('void/:billId')
  @ApiOperation({ summary: 'Owner: cancel a Quick pay bill within 7 days' })
  voidBill(@CurrentUser() user: QuickActor, @Param('billId', ParseUUIDPipe) billId: string) {
    return this.quick.voidBill(user, billId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Customer: current state of my Quick pay request' })
  status(@CurrentUser() user: QuickActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.quick.status(user, id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Customer: confirm or decline the amount the shop entered' })
  confirm(
    @CurrentUser() user: QuickActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideQuickBillDto,
  ) {
    return this.quick.decide(user, id, dto.accept);
  }
}
