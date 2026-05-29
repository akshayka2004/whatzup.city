import { IsString, IsNotEmpty, IsUUID, Matches, IsNumber, Min, IsOptional, IsArray, MaxLength } from 'class-validator';

export class GetUploadUrlDto {
  @IsUUID()
  @IsNotEmpty()
  businessId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt)$/i, {
    message: 'Filename must have a valid extension (jpg, jpeg, png, gif, webp, pdf, doc, docx, txt)',
  })
  filename!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;
}

export class CreateMediaDto {
  @IsUUID()
  @IsNotEmpty()
  businessId!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsNumber()
  @Min(0)
  size!: number;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
