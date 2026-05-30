import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLinkDto {
  @ApiProperty({ description: 'Display heading for the link (e.g., Facebook)' })
  @IsString()
  @MaxLength(60)
  label!: string;

  @ApiProperty({ description: 'Full URL of the social media page' })
  @IsString()
  @MaxLength(500)
  url!: string;
}

export class UpdateCivicProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

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
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({ required: false, type: [SocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
