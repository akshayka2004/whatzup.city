import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitProofDto } from './dto/event-tickets.dto';
import { EventPaymentsService } from './event-payments.service';
import { EventTicketsService } from './event-tickets.service';

/** The signed-in user's own tickets. Not throttled per IP: a whole venue opens tickets at the door. */
@ApiTags('Event tickets')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly tickets: EventTicketsService,
    private readonly payments: EventPaymentsService,
  ) {}

  @Get('payments/:paymentId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'One of my payments, with where to pay while it is open' })
  payment(@CurrentUser('id') userId: string, @Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.payments.mine(userId, paymentId);
  }

  @Post('payments/:paymentId/proof')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send the UPI reference (and optional screenshot) after paying' })
  proof(
    @CurrentUser('id') userId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: SubmitProofDto,
  ) {
    return this.payments.submitProof(userId, paymentId, dto);
  }

  @Post('payments/:paymentId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Give up a held seat before it is verified' })
  cancelPayment(
    @CurrentUser('id') userId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.payments.cancel(userId, paymentId);
  }

  @Get('mine')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'My tickets, grouped by event' })
  mine(@CurrentUser('id') userId: string) {
    return this.tickets.mine(userId);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'One of my tickets, with its signed QR' })
  one(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.getTicket(userId, id);
  }
}
