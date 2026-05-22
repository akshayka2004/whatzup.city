import { IsString, IsOptional, IsDateString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign message title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Campaign message description / body' })
  @IsString()
  body!: string;

  @ApiProperty({ description: 'Target audience parameters', required: false })
  @IsObject()
  @IsOptional()
  targetAudience?: Record<string, any>;

  @ApiProperty({ description: 'Scheduled date and time to publish (ISO string)', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
