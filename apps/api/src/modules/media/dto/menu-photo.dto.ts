import { IsString, IsNotEmpty, IsUUID, IsInt, Min, IsOptional, MaxLength } from 'class-validator';

export class MenuUploadUrlDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'The file name is too long (255 characters max). Rename the file and try again.' })
  filename!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @Min(1, { message: 'The selected file is empty.' })
  size!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'The photo label is too long (80 characters max).' })
  label?: string;
}

export class CreateMenuPhotoDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fileKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'The file name is too long (255 characters max). Rename the file and try again.' })
  filename!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType!: string;

  @IsInt()
  @Min(1, { message: 'The selected file is empty.' })
  size!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'The photo label is too long (80 characters max).' })
  label?: string;
}
