import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsIn,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';

const REWARD_TYPES = ['PERCENT', 'AMOUNT', 'FREEBIE'];
const STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'];

export class CreateVoucherDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(1) thresholdAmount!: number;
  @IsOptional() @IsIn(REWARD_TYPES) rewardType?: string;
  @IsOptional() @IsNumber() rewardValue?: number;
  @IsOptional() @IsString() rewardLabel?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsArray() targetCities?: string[];
}

export class UpdateVoucherDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(1) thresholdAmount?: number;
  @IsOptional() @IsIn(REWARD_TYPES) rewardType?: string;
  @IsOptional() @IsNumber() rewardValue?: number;
  @IsOptional() @IsString() rewardLabel?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsArray() targetCities?: string[];
}

export class RedeemVoucherDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() code!: string;
}
