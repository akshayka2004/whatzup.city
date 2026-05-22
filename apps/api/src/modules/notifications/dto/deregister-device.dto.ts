import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeregisterDeviceDto {
  @ApiProperty({ description: 'FCM push registration token to remove' })
  @IsString()
  token!: string;
}
