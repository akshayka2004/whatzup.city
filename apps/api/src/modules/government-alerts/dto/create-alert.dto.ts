import { IsString, IsOptional, IsDateString, IsObject, IsEnum, IsArray, MaxLength, ArrayMaxSize } from 'class-validator';
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
  @MaxLength(500)
  title!: string;

  @ApiProperty({ description: 'Full body text of the alert' })
  @IsString()
  body!: string;

  @ApiProperty({ description: 'Category of the alert (e.g., EMERGENCY, ROAD_BLOCK, WEATHER)' })
  @IsString()
  @MaxLength(100)
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
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @IsOptional()
  targetCities?: string[];

  @ApiProperty({ description: 'Optional external link / URL', required: false })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  linkUrl?: string;

  @ApiProperty({ description: 'Effective / start date (ISO string)', required: false })
  @IsDateString()
  @IsOptional()
  startAt?: string;
}
