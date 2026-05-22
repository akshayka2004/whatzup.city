import { IsString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Verification reset token received via email' })
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'Minimum 8 character secure password',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({ description: 'Tenant UUID association' })
  @IsUUID()
  tenantId!: string;
}
