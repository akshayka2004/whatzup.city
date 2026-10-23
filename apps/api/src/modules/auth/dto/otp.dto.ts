import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpRequestDto {
  @ApiProperty({ example: '9876543210', description: '10-digit Indian mobile number' })
  @IsString()
  @MaxLength(20)
  phone!: string;
}

export class OtpVerifyDto extends OtpRequestDto {
  @ApiProperty({ example: '482913' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' })
  code!: string;
}
