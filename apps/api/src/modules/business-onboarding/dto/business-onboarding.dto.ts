import {
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessProfileType } from '@saas/types';

export class StartBusinessOnboardingDto {
  @ApiProperty({ example: 'Sunrise Cafe' })
  @IsString()
  businessName!: string;

  @ApiProperty({ example: 'restaurants' })
  @IsString()
  categorySlug!: string;

  @ApiProperty({ example: ['cafes', 'bakery'], required: false })
  @IsOptional()
  @IsArray()
  subcategorySlugs?: string[];

  @ApiProperty({ enum: BusinessProfileType, example: BusinessProfileType.OWNER, required: false })
  @IsOptional()
  @IsEnum(BusinessProfileType)
  profileType?: BusinessProfileType;

  @ApiProperty({ example: 'default' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateBusinessDetailsDto {
  @ApiProperty({ example: 'Artisan coffee and fresh pastries' })
  @IsOptional()
  @IsString()
  businessDescription?: string;

  @ApiProperty({ example: 'Jane Business' })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiProperty({ example: 'jane@sunrisecafe.com' })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiProperty({ example: '+912212345678' })
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiProperty({ example: 'https://sunrisecafe.com' })
  @IsOptional()
  @IsString()
  businessWebsite?: string;

  @ApiProperty({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Mumbai Suburban' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '400001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: 19.076 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 72.8777 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: 'https://maps.google.com/...' })
  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  @ApiProperty({ example: { instagram: 'sunrise_cafe', facebook: 'sunrisecafe' } })
  @IsOptional()
  @IsObject()
  socialLinks?: any;

  @ApiProperty({ example: { monday: '09:00-21:00', tuesday: '09:00-21:00' } })
  @IsOptional()
  @IsObject()
  operatingHours?: any;

  @ApiProperty({ example: ['cafe', 'coffee', 'breakfast'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ example: ['cafes', 'bakery'], required: false })
  @IsOptional()
  @IsArray()
  subcategorySlugs?: string[];
}
