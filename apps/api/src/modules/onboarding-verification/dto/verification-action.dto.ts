import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveOnboardingDto {
  @ApiProperty({ example: 'Verified GST and logo assets. Looks good.', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectOnboardingDto {
  @ApiProperty({ example: 'GST registration certificate document is expired or illegible.' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
