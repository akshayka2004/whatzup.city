import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityDto {
  @ApiProperty({ required: false, example: 'owner@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    enum: ['BUSINESS', 'CUSTOMER', 'OTHER'],
    description:
      'Which sign-up this is for; the phone rules differ (see AuthService.checkAvailability)',
  })
  @IsIn(['BUSINESS', 'CUSTOMER', 'OTHER'])
  kind!: 'BUSINESS' | 'CUSTOMER' | 'OTHER';
}
