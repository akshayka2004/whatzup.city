import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The first name is too long (100 characters max).' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The last name is too long (100 characters max).' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+919999999999' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'The phone is too long (50 characters max).' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The city is too long (100 characters max).' })
  city?: string;

  @ApiPropertyOptional({ example: 'Mumbai Suburban' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The district is too long (100 characters max).' })
  district?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The state is too long (100 characters max).' })
  state?: string;

  @ApiPropertyOptional({ example: { categories: ['restaurants'], notifications: true } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
