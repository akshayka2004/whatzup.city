import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CivicSignupDto {
  @ApiProperty({
    enum: ['NGO', 'COMMUNITY', 'NEWS_FORUM'],
    description: 'Organisation sub-type',
  })
  @IsString()
  @IsIn(['NGO', 'COMMUNITY', 'NEWS_FORUM'])
  organizationType!: string;

  @ApiProperty({ description: 'Official organisation name' })
  @IsString()
  organizationName!: string;

  @ApiProperty({ description: 'Primary contact person name' })
  @IsString()
  contactName!: string;

  @ApiProperty({ description: 'Official email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  phone!: string;

  @ApiProperty({ description: 'Strong account password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  acceptedPrivacyPolicy?: boolean;
}
