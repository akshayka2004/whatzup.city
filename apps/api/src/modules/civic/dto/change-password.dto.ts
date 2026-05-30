import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current account password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'New password (min 8 chars, strong)' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
