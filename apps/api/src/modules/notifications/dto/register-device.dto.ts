import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM push registration token' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Type of device (e.g., iOS, Android, Web)' })
  @IsString()
  deviceType!: string;

  @ApiProperty({ description: 'Operating system details', required: false })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiProperty({ description: 'Browser name', required: false })
  @IsString()
  @IsOptional()
  browser?: string;

  @ApiProperty({ description: 'IP address of the client device', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;
}
