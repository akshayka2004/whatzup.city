import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsIn,
  IsArray,
  IsBoolean,
  IsObject,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { SPEND_WINDOWS } from '../../rewards/reward-rules';

const REWARD_TYPES = ['PERCENT', 'AMOUNT', 'FREEBIE'];
const STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'];
const WINDOWS = [...SPEND_WINDOWS] as string[];

export class CreateVoucherDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(1) thresholdAmount!: number;
  @IsOptional() @IsIn(REWARD_TYPES) rewardType?: string;
  @IsOptional() @IsNumber() rewardValue?: number;
  @IsOptional() @IsString() @MaxLength(255) rewardLabel?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsArray() targetCities?: string[];
  @IsOptional() @IsIn(WINDOWS) spendWindow?: string;
  @IsOptional() @IsBoolean() repeatable?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(50) perCustomerLimit?: number;
  @IsOptional() @IsInt() @Min(3) @Max(90) claimValidDays?: number;
  @IsOptional() @IsObject() audience?: Record<string, unknown>;
}

export class UpdateVoucherDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(1) thresholdAmount?: number;
  @IsOptional() @IsIn(REWARD_TYPES) rewardType?: string;
  @IsOptional() @IsNumber() rewardValue?: number;
  @IsOptional() @IsString() @MaxLength(255) rewardLabel?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsArray() targetCities?: string[];
  @IsOptional() @IsIn(WINDOWS) spendWindow?: string;
  @IsOptional() @IsBoolean() repeatable?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(50) perCustomerLimit?: number;
  @IsOptional() @IsInt() @Min(3) @Max(90) claimValidDays?: number;
  @IsOptional() @IsObject() audience?: Record<string, unknown>;
}

export class RedeemVoucherDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) code!: string;
  /** What the staff member rang up, for the owner's records. Optional. */
  @IsOptional() @IsNumber() @Min(0) @Max(10_000_000) billAmount?: number;
}

export class LookupVoucherDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) code!: string;
}

export class AudiencePreviewDto {
  @IsString() @IsNotEmpty() businessId!: string;
  @IsObject() audience!: Record<string, unknown>;
}

export class AdminRewardStatusDto {
  @IsIn(['ACTIVE', 'PAUSED']) status!: string;
}
