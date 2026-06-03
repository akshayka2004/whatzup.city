import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
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
}
