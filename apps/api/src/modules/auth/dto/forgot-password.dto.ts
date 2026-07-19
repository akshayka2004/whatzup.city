import { IsEmail, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  // Optional — a public user doesn't know their tenant. When omitted the
  // service matches by email alone (Prisma ignores an undefined tenantId).
  // Mirrors LoginDto, which is also tenant-optional.
  @ApiProperty({ description: 'Tenant UUID association', required: false })
  @IsUUID()
  @IsOptional()
  tenantId?: string;
}
