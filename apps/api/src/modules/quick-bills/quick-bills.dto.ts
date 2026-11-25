import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class EnterQuickBillDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() @MaxLength(12) code!: string;
  @IsNumber() @Min(1) @Max(1_000_000) amount!: number;
  @IsOptional() @IsString() @MaxLength(60) billNumber?: string;
}

export class DecideQuickBillDto {
  @IsBoolean() accept!: boolean;
}
