import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(2, { message: 'Enter a category name.' })
  @MaxLength(100, { message: 'The name is too long (100 characters max).' })
  name!: string;

  @ApiProperty({ required: false, maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameMl?: string;

  @ApiProperty({
    required: false,
    description: 'Permanent code; generated from the name when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    required: false,
    description: 'What the category behaves like (RESTAURANT, RETAIL …)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  template?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameMl?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  template?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiProperty({
    required: false,
    description: 'false archives the category (hidden from new sign-ups)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MergeCategoryDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'Choose the category to merge into.' })
  targetId!: string;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [String], description: 'Category ids in the new order (same parent)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @IsUUID(undefined, { each: true })
  ids!: string[];
}
