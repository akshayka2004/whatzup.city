import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@saas/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService, type SupportUser } from './support.service';

class CreateTicketDto {
  @IsString() @MinLength(4) @MaxLength(200) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) body!: string;
  @IsOptional()
  @IsIn(['GENERAL', 'BILLING', 'LISTING', 'BILLS', 'TECHNICAL', 'ACCOUNT'])
  category?: string;
  @IsOptional() @IsUUID() businessId?: string;
}

class ReplyDto {
  @IsString() @MinLength(1) @MaxLength(5000) body!: string;
}

class StatusDto {
  @IsIn(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']) status!: string;
}

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Open a support ticket' })
  create(@CurrentUser() user: SupportUser, @Body() dto: CreateTicketDto) {
    return this.support.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "My tickets, or a business's tickets when businessId is given" })
  list(@CurrentUser() user: SupportUser, @Query('businessId') businessId?: string) {
    return this.support.listMine(user, businessId || undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN, UserRole.PLATFORM_STAFF)
  @Get('admin/all')
  @ApiOperation({ summary: 'Support inbox for the platform team' })
  listAll(@Query('status') status?: string, @Query('page') page?: string) {
    return this.support.listAll(status, page ? Number(page) : 1);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: SupportUser) {
    return this.support.get(id, user);
  }

  @Post(':id/messages')
  reply(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: SupportUser,
    @Body() dto: ReplyDto,
  ) {
    return this.support.reply(id, user, dto.body);
  }

  @Patch(':id/status')
  status(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: SupportUser,
    @Body() dto: StatusDto,
  ) {
    return this.support.setStatus(id, user, dto.status);
  }
}
