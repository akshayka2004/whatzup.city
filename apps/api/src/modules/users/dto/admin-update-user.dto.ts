import { IsOptional, IsString, IsBoolean, IsEnum, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@saas/types';

/**
 * `role` used to pass straight through to Prisma with no check — Postgres'
 * native `UserRoleEnum` type rejects a bad value, but as a raw DB crash
 * (500) instead of a clean 400. `@IsEnum` catches it before the query runs.
 */
export class AdminUpdateUserDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  profession?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, enum: UserRole })
  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @ApiProperty({ required: false, description: 'Sets a new password directly (admin action)' })
  @IsOptional() @IsString() @MinLength(8)
  password?: string;
}
