import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuPhotosService } from './menu-photos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MenuUploadUrlDto, CreateMenuPhotoDto } from './dto/menu-photo.dto';

const businessIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('That business ID is not valid.'),
});

@ApiTags('Menu photos')
@Controller('media/menu')
export class MenuPhotosController {
  constructor(private readonly menuPhotos: MenuPhotosService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Signed upload URL for a food-menu photo (food businesses only)' })
  async uploadUrl(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: MenuUploadUrlDto,
  ) {
    return this.menuPhotos.createUploadUrl(tenantId, { userId, role }, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register an uploaded food-menu photo' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateMenuPhotoDto,
  ) {
    return this.menuPhotos.createRecord(tenantId, { userId, role }, dto);
  }

  @Public()
  @Get('business/:businessId')
  @ApiOperation({ summary: 'Food-menu photos for a business (public)' })
  async list(@Param('businessId', businessIdPipe) businessId: string) {
    return this.menuPhotos.listPublic(businessId);
  }
}
