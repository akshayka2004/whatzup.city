import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessProfileType } from '@prisma/client';

export class BusinessSignupDto {
  @ApiProperty({ example: 'John Owner', description: 'Business Owner Full Name' })
  @IsString()
  ownerName!: string;

  @ApiProperty({ example: 'owner@sunrisecafe.com', description: 'Business/Owner Email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+912212345678', description: 'Business/Owner Phone' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Strong password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Sunrise Cafe', description: 'Business Name' })
  @IsString()
  businessName!: string;

  @ApiProperty({ example: 'restaurants', description: 'Category Slug' })
  @IsString()
  categorySlug!: string;

  @ApiProperty({ example: ['cafes', 'bakery'], required: false })
  @IsOptional()
  @IsArray()
  subcategorySlugs?: string[];

  @ApiProperty({ example: 'HALAL', enum: ['HALAL', 'NON_HALAL'], required: false, description: 'Food businesses only' })
  @IsOptional()
  @IsString()
  halalStatus?: string;

  @ApiProperty({ enum: BusinessProfileType, default: BusinessProfileType.OWNER, required: false })
  @IsOptional()
  @IsEnum(BusinessProfileType)
  profileType?: BusinessProfileType;

  @ApiProperty({ description: 'Referral code of the user who invited you', required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({ description: 'User accepted Terms of Service', required: false })
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;

  @ApiProperty({ description: 'User accepted Privacy Policy', required: false })
  @IsOptional()
  @IsBoolean()
  acceptedPrivacyPolicy?: boolean;
}
