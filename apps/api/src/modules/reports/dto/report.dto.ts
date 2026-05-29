import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StripHtmlInput } from '../../../common/decorators/sanitize.decorator';

export class CreateReportDto {
  @ApiProperty({ example: 'BUSINESS', required: false })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001', required: false })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiProperty({ example: 'SPAM' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 'The listing is posting misleading advertisements.' })
  @IsString()
  @IsNotEmpty()
  @StripHtmlInput()
  description!: string;

  @ApiProperty({ example: ['https://bucket.r2.dev/spam-evidence.png'], required: false })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidence?: string[];

  /** Human-readable subject line from the report form */
  @ApiProperty({ example: 'Fake Business Listing', required: false })
  @IsOptional()
  @IsString()
  @StripHtmlInput()
  subject?: string;

  /** Name of the business/entity being reported */
  @ApiProperty({ example: 'Acme Store', required: false })
  @IsOptional()
  @IsString()
  @StripHtmlInput()
  targetName?: string;
}

export class ResolveReportDto {
  @ApiProperty({ example: 'Confirmed spam listing. Business owner has been notified.' })
  @IsString()
  @IsNotEmpty()
  @StripHtmlInput()
  resolution!: string;
}
