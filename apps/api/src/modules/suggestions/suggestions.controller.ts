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
import { UserRole } from '@saas/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSuggestionDto, ReviewSuggestionDto } from './dto/suggestion.dto';
import { SuggestionsService, type SuggestionUser } from './suggestions.service';

@ApiTags('Suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestions: SuggestionsService) {}

  // ── admin (literal routes before anything with a parameter) ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Suggestions for the platform admins to review' })
  adminList(
    @Query('status') status?: string,
    @Query('topic') topic?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
  ) {
    return this.suggestions.adminList({ status, topic, search, page });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/:id')
  @ApiOperation({
    summary: 'Mark a suggestion reviewed, planned or declined, with an optional note',
  })
  review(
    @CurrentUser() user: SuggestionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSuggestionDto,
  ) {
    return this.suggestions.review({ id: user.id, tenantId: user.tenantId }, id, dto);
  }

  // ── any signed-in person ────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Send a suggestion to the platform team' })
  create(@CurrentUser() user: SuggestionUser, @Body() dto: CreateSuggestionDto) {
    return this.suggestions.create(user, dto);
  }
}
