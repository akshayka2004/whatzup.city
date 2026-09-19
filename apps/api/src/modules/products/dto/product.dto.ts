import { IsOptional, IsString, IsNumber, IsInt, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ required: false, description: 'create() only' })
  @IsOptional() @IsString()
  businessId?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional() @IsInt()
  sortOrder?: number;
}
