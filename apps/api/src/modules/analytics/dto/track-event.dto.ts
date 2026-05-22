import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({ description: 'Tenant ID of the organization', required: false })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ description: 'Optional User ID generating the action', required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Optional Business ID associated with the action', required: false })
  @IsUUID()
  @IsOptional()
  businessId?: string;

  @ApiProperty({ description: 'Event action type (e.g., BUSINESS_VIEW, OFFER_CLICK)' })
  @IsString()
  event!: string;

  @ApiProperty({ description: 'Arbitrary JSON key-value telemetry data', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'IP address of the client device', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ description: 'Client User Agent', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiProperty({ description: 'Browser session token', required: false })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
