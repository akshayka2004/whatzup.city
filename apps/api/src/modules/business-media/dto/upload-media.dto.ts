import { IsEnum, IsString, IsNotEmpty, IsInt, Max, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BusinessMediaType {
  LOGO = 'LOGO',
  COVER_BANNER = 'COVER_BANNER',
  GALLERY = 'GALLERY',
  PROMO_VIDEO = 'PROMO_VIDEO',
}

export class UploadMediaDto {
  @ApiProperty({ example: 'LOGO', description: 'Can be LOGO, COVER_BANNER, GALLERY, PROMO_VIDEO' })
  @IsEnum(BusinessMediaType)
  @IsNotEmpty()
  mediaType!: BusinessMediaType;

  @ApiProperty({ example: 'logo.png', description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'The filename is too long (255 characters max).' })
  filename!: string;

  @ApiProperty({ example: 'image/png', description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'The mime type is too long (100 characters max).' })
  mimeType!: string;

  @ApiProperty({ example: 1024500, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(50000000) // Max 50MB for videos
  size!: number;
}
