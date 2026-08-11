import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlatformOfferCategoryEnum {
  SADYA = 'SADYA',
  CLOTHING = 'CLOTHING',
  ELECTRONICS = 'ELECTRONICS',
  STAYCATION = 'STAYCATION',
}

export enum PlatformOfferStatusEnum {
  UNPUBLISHED = 'UNPUBLISHED',
  PUBLISHED = 'PUBLISHED',
}

/** Staycation only. */
export enum StaycationSubTypeEnum {
  PROPERTY = 'PROPERTY',
  DAYOUT = 'DAYOUT',
}

export class CreatePlatformOfferDto {
  @ApiProperty({ enum: PlatformOfferCategoryEnum })
  @IsEnum(PlatformOfferCategoryEnum)
  category!: PlatformOfferCategoryEnum;

  @ApiProperty({ enum: StaycationSubTypeEnum, required: false })
  @IsOptional()
  @IsEnum(StaycationSubTypeEnum)
  subType?: StaycationSubTypeEnum;

  @ApiProperty({ example: 'Grand Hyatt Onam Sadya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Kochi, Kerala' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location!: string;

  @ApiProperty({ example: '₹850 per head', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  price?: string;

  @ApiProperty({ example: '+91 98470 12345', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ required: false, description: 'JSON {bucket,path} of the uploaded poster' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Category-specific fields' })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiProperty({ enum: PlatformOfferStatusEnum, required: false })
  @IsOptional()
  @IsEnum(PlatformOfferStatusEnum)
  status?: PlatformOfferStatusEnum;
}

export class UpdatePlatformOfferDto extends CreatePlatformOfferDto {
  @ApiProperty({ enum: PlatformOfferCategoryEnum, required: false })
  @IsOptional()
  @IsEnum(PlatformOfferCategoryEnum)
  declare category: PlatformOfferCategoryEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  declare title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  declare location: string;
}

export class SetPlatformOfferStatusDto {
  @ApiProperty({ enum: PlatformOfferStatusEnum })
  @IsEnum(PlatformOfferStatusEnum)
  status!: PlatformOfferStatusEnum;
}
