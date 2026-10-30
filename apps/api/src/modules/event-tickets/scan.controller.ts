import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { clientIp } from '../../common/utils/client-ip';
import { Crew, CrewGuard } from './crew.guard';
import { EventCrewService, type CrewContext } from './event-crew.service';
import { EventScanService } from './event-scan.service';
import { ScanCodeDto, ScanLoginDto, ScanQrDto, ScanTicketDto } from './dto/event-tickets.dto';

/**
 * The gate scanner. Not behind a user login: crew sign in with a pass code and send the token it
 * returns in x-crew-token. The per-IP throttle is off here (a venue shares one IP); the pass
 * limits itself in CrewGuard, and the sign-in route limits itself harder in EventCrewService.
 */
@ApiTags('Event scanner')
@Public()
@Controller('scan')
export class ScanController {
  constructor(
    private readonly crew: EventCrewService,
    private readonly scan: EventScanService,
  ) {}

  @SkipThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in a phone with a crew pass code' })
  login(@Body() dto: ScanLoginDto, @Req() req: Request) {
    return this.crew.login(dto.code, dto.deviceId, clientIp(req) || 'unknown');
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Crew() ctx: CrewContext) {
    return this.crew.logout(ctx);
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a scanned ticket QR' })
  checkIn(@Crew() ctx: CrewContext, @Body() dto: ScanQrDto) {
    return this.scan.scanQr(ctx, dto.qr);
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Post('code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in by the short code under the QR' })
  byCode(@Crew() ctx: CrewContext, @Body() dto: ScanCodeDto) {
    return this.scan.byCode(ctx, dto.code);
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Post('manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a person picked from the list (desk passes)' })
  manual(@Crew() ctx: CrewContext, @Body() dto: ScanTicketDto) {
    return this.scan.manual(ctx, dto.ticketId);
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Post('undo')
  @HttpCode(HttpStatus.OK)
  undo(@Crew() ctx: CrewContext, @Body() dto: ScanTicketDto) {
    return this.scan.undo(ctx, dto.ticketId);
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Get('search')
  search(@Crew() ctx: CrewContext, @Query('q') q: string) {
    return this.scan.search(ctx, q);
  }

  @SkipThrottle()
  @UseGuards(CrewGuard)
  @Get('stats')
  stats(@Crew() ctx: CrewContext) {
    return this.scan.stats(ctx);
  }
}
