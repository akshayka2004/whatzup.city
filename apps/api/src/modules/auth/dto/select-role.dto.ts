import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum, EntityType } from '@prisma/client';

export class SelectRoleDto {
  @ApiProperty({ enum: UserRoleEnum, description: 'Selected user role' })
  @IsEnum(UserRoleEnum)
  role!: UserRoleEnum;

  @ApiProperty({ enum: EntityType, description: 'Selected entity type' })
  @IsEnum(EntityType)
  entityType!: EntityType;

  @ApiProperty({ example: 'My Custom Name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '+919999999999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
