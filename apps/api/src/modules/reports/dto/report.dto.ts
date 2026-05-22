import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StripHtmlInput } from '../../../common/decorators/sanitize.decorator';

export class CreateReportDto {
  @ApiProperty({ example: 'BUSINESS' })
  @IsString()
  @IsNotEmpty()
  targetType!: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  targetId!: string;

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
}

export class ResolveReportDto {
  @ApiProperty({ example: 'Confirmed spam listing. Business owner has been notified.' })
  @IsString()
  @IsNotEmpty()
  @StripHtmlInput()
  resolution!: string;
}
