import { IsString, IsOptional, IsDateString, IsObject, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateAlertDto {
  @ApiProperty({ description: 'Alert headline / title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Full body text of the alert' })
  @IsString()
  body!: string;

  @ApiProperty({ description: 'Category of the alert (e.g., EMERGENCY, ROAD_BLOCK, WEATHER)' })
  @IsString()
  category!: string;

  @ApiProperty({
    description: 'Priority level (LOW, MEDIUM, HIGH, CRITICAL)',
    enum: AlertPriority,
    default: AlertPriority.MEDIUM,
  })
  @IsEnum(AlertPriority)
  priority!: AlertPriority;

  @ApiProperty({ description: 'Scheduled date and time to publish (ISO string)', required: false })
  @IsDateString()
  @IsOptional()
  publishAt?: string;

  @ApiProperty({ description: 'Optional expiration date and time (ISO string)', required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({
    description: 'Audience filtering criteria (e.g., region targeting)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  targetAudience?: Record<string, any>;

  @ApiProperty({
    description: 'Cities to show this in. Empty = all cities.',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  targetCities?: string[];
}
