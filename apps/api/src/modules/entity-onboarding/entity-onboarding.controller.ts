import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntityOnboardingService } from './entity-onboarding.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateOnboardingStepDto, UploadEntityDocumentDto } from './dto/entity-onboarding.dto';

@ApiTags('Entity Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entity-onboarding')
export class EntityOnboardingController {
  constructor(private readonly onboardingService: EntityOnboardingService) {}

  @Get(':entityId/progress')
  @ApiOperation({ summary: 'Get current onboarding progress and profile details' })
  async getProgress(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.onboardingService.getProgress(userId, tenantId, entityId);
  }

  @Put(':entityId/step/:step')
  @ApiOperation({ summary: 'Update specialized profile information for a specific step' })
  async updateStep(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
    @Param('step', ParseIntPipe) step: number,
    @Body() dto: UpdateOnboardingStepDto,
  ) {
    return this.onboardingService.updateStep(userId, tenantId, entityId, step, dto);
  }

  @Post(':entityId/document/upload-url')
  @ApiOperation({ summary: 'Request presigned upload URL for onboarding document' })
  async getSignedUploadUrl(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
    @Body() body: { filename: string; mimeType: string },
  ) {
    return this.onboardingService.getSignedUploadUrl(
      userId,
      tenantId,
      entityId,
      body.filename,
      body.mimeType,
    );
  }

  @Post(':entityId/document')
  @ApiOperation({ summary: 'Save uploaded document details' })
  async attachDocument(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
    @Body() dto: UploadEntityDocumentDto,
  ) {
    return this.onboardingService.attachDocument(userId, tenantId, entityId, dto);
  }

  @Get(':entityId/document')
  @ApiOperation({ summary: 'List all documents uploaded for the entity' })
  async getDocuments(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.onboardingService.getDocuments(userId, tenantId, entityId);
  }

  @Delete(':entityId/document/:documentId')
  @ApiOperation({ summary: 'Delete an uploaded verification document' })
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.onboardingService.deleteDocument(userId, tenantId, entityId, documentId);
  }

  @Post(':entityId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit onboarding data and documents for manual verification' })
  async submitForVerification(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.onboardingService.submitForVerification(userId, tenantId, entityId);
  }
}
