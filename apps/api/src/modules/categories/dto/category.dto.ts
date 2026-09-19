import { IsOptional, IsString, IsBoolean, IsInt, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
