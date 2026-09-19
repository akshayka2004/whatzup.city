import { IsOptional, IsString, IsBoolean, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BranchDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  address?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  state?: string;

  @ApiProperty({ required: false, maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  zipCode?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  managerName?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  managerPhone?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsEmail() @MaxLength(255)
  managerEmail?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  operatingHours?: string;

  @ApiProperty({ required: false, maxLength: 255, description: 'Alias for operatingHours' })
  @IsOptional() @IsString() @MaxLength(255)
  hours?: string;

  @ApiProperty({ required: false, description: '"lat,lng" — parsed server-side' })
  @IsOptional() @IsString() @MaxLength(64)
  geoCoords?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  // Optional branch-admin auto-create (create only — see BranchesService.create)
  @ApiProperty({ required: false })
  @IsOptional() @IsEmail() @MaxLength(255)
  adminEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MinLength(8)
  adminPassword?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  adminName?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  adminPhone?: string;
}
