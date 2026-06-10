import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Reference list of common document types. Kept for documentation; the field
// accepts any non-empty label so registration flows (REGISTRATION_CERTIFICATE,
// TAX_DOCUMENT, UTILITY_BILL, …) are not rejected. Stored as free text.
export enum BusinessDocumentType {
  GST_CERTIFICATE = 'GST_CERTIFICATE',
  TRADE_LICENSE = 'TRADE_LICENSE',
  BUSINESS_REGISTRATION_PROOF = 'BUSINESS_REGISTRATION_PROOF',
  OWNER_ID_PROOF = 'OWNER_ID_PROOF',
  FSSAI_LICENSE = 'FSSAI_LICENSE',
  CATEGORY_DOCUMENT = 'CATEGORY_DOCUMENT',
}

export class UploadDocumentDto {
  @ApiProperty({ example: 'BUSINESS_REGISTRATION_PROOF', description: 'Type/label of document' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({ example: 'gst-cert.pdf', description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 'GSTIN123456789A', required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ example: 'Government of India', required: false })
  @IsOptional()
  @IsString()
  issuedAuthority?: string;

  @ApiProperty({ example: '2030-12-31T00:00:00.000Z', required: false })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes (max 10MB)', required: false })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiProperty({ example: 'food', description: 'Business category slug this doc belongs to', required: false })
  @IsOptional()
  @IsString()
  documentCategory?: string;

  @ApiProperty({ example: 'FSSAI_LICENSE', description: 'Category-specific document subtype', required: false })
  @IsOptional()
  @IsString()
  documentSubtype?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiProperty({ example: true, description: 'Whether this document is mandatory', required: false })
  @IsOptional()
  isMandatory?: boolean;
}
