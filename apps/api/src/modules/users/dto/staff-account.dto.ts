import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ROLES = ['PLATFORM_STAFF', 'MASTER_ADMIN'] as const;

export class CreateStaffDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;
  @ApiProperty() @IsEmail() @MaxLength(255) email!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiProperty({ description: 'Temporary password; the person must change it at first sign-in' })
  @IsString()
  @MaxLength(128)
  password!: string;
  @ApiProperty({ enum: ROLES }) @IsIn(ROLES) role!: (typeof ROLES)[number];
  @ApiProperty({ example: { events: 'manage', businesses: 'view' } })
  @IsObject()
  grants!: Record<string, string>;
}

export class UpdateStaffDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiProperty({ required: false, enum: ROLES })
  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];
  @ApiProperty({ required: false }) @IsOptional() @IsObject() grants?: Record<string, string>;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ResetStaffPasswordDto {
  @ApiProperty() @IsString() @MaxLength(128) password!: string;
}
