import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOnboardingStepDto {
  // Influencer Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  niche?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  followersCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  engagementRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mediaKitUrl?: string;

  // Professional Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  experienceYears?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  serviceAreas?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pricingMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pricingMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  availability?: Record<string, any>;

  // Event Organizer Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  eventCategories?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  venuePartnerships?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  ticketingSupport?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, any>;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  previousEvents?: Record<string, any>[];

  // NGO / Organization Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ngoName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  causeCategory?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  operationalAreas?: string[];

  // Government Fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  officialEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  // General Metadata
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UploadEntityDocumentDto {
  @ApiProperty({ example: 'Business License', description: 'Type of verification document' })
  @IsString()
  documentType!: string;

  @ApiProperty({ example: 'https://cloud-storage.com/doc.pdf', description: 'URL of the uploaded file' })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ example: 'LIC-12345', required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ example: 'Government of Karnataka', required: false })
  @IsOptional()
  @IsString()
  issuedAuthority?: string;

  @ApiProperty({ example: '2030-12-31', required: false })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({ example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ example: 'document.pdf', required: false })
  @IsOptional()
  @IsString()
  filename?: string;
}
