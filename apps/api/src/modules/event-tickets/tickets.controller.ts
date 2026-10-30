import { Controller, Get, Header, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EventTicketsService } from './event-tickets.service';

/** The signed-in user's own tickets. Not throttled per IP: a whole venue opens tickets at the door. */
@ApiTags('Event tickets')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: EventTicketsService) {}

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
