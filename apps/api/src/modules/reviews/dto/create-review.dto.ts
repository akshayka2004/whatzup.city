import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StripHtmlInput } from '../../../common/decorators/sanitize.decorator';

export class CreateReviewDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Great coffee!', required: false })
  @IsOptional()
  @IsString()
  @StripHtmlInput()
  title?: string;

  @ApiProperty({ example: 'Really liked the cappuccino here. Fast service.' })
  @IsString()
  @IsNotEmpty()
  @StripHtmlInput()
  comment!: string;

  @ApiProperty({ example: ['https://bucket.r2.dev/cappuccino.png'], required: false })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];
}
