import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerSignupDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(255, { message: 'The email is too long (255 characters max).' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100, { message: 'The first name is too long (100 characters max).' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100, { message: 'The last name is too long (100 characters max).' })
  lastName!: string;

  @ApiProperty({ example: '+919999999999', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'The phone is too long (50 characters max).' })
  phone?: string;

  @ApiProperty({ example: 'default' })
  @IsString()
  tenantId!: string;
}

export class ProfileCompletionDto {
  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'Mumbai Suburban' })
  @IsString()
  district!: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  state!: string;

  @ApiProperty({
    example: { categories: ['Restaurants', 'Retail'], notificationFrequency: 'daily' },
  })
  @IsOptional()
  preferences?: any;

  @ApiProperty({ example: 'https://avatar-url.com/johndoe.png', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class PreparePhoneVerificationDto {
  @ApiProperty({ example: '+919999999999' })
  @IsString()
  phone!: string;
}
