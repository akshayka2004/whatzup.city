import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerSignupDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+919999999999', required: false })
  @IsOptional()
  @IsString()
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
