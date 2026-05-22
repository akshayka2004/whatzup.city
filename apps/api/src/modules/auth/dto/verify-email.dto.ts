import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Tenant UUID association' })
  @IsUUID()
  tenantId!: string;
}
