import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  IsIn,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { OFFER_CHANNELS } from '@saas/types';
import { ApiProperty } from '@nestjs/swagger';

export class OfferDto {
  @ApiProperty({ required: false, description: 'Owner-side create() only' })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    description:
      'DRAFT | ACTIVE | PAUSED | EXPIRED | ARCHIVED — service validates against the allow-list',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maxRedemptions?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetCities?: string[];

  @ApiProperty({
    required: false,
    enum: ['DINE_IN', 'TAKEAWAY', 'BOTH'],
    description: 'Food-type businesses: where the offer applies. Defaults to BOTH.',
  })
  @IsOptional()
  @IsIn(['DINE_IN', 'TAKEAWAY', 'BOTH'], {
    message: 'Choose dine-in, takeaway or both for where the offer applies.',
  })
  fulfilment?: 'DINE_IN' | 'TAKEAWAY' | 'BOTH';

  @ApiProperty({
    required: false,
    enum: OFFER_CHANNELS,
    isArray: true,
    description:
      'Where the offer applies: any of INSTORE, TAKEAWAY, ONLINE. Defaults to all three.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one: instore, takeaway or online.' })
  @ArrayMaxSize(3)
  @IsIn(OFFER_CHANNELS as unknown as string[], {
    each: true,
    message: 'Choose instore, takeaway or online for where the offer applies.',
  })
  channels?: string[];
}
