import {
  IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf,
} from 'class-validator';

export class ConvertBrandDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter the brand name.' })
  @MaxLength(255, { message: 'The brand name is too long (255 characters max).' })
  brandName!: string;

  /** Label for the existing business as an outlet, e.g. "Kozhikode - Mavoor Road". */
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The outlet label is too long (100 characters max).' })
  outletLabel?: string;

  @IsIn(['SHARED', 'PER_OUTLET'], { message: 'Choose whether every outlet uses the same bill series.' })
  billSeriesMode!: 'SHARED' | 'PER_OUTLET';

  @ValidateIf((o) => o.billSeriesMode === 'SHARED')
  @IsString()
  @IsNotEmpty({ message: 'Enter the bill series prefix your outlets share.' })
  @MaxLength(30, { message: 'The bill series prefix is too long (30 characters max).' })
  billSeriesPrefix?: string;
}

export class PromptResponseDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsIn(['SNOOZE', 'DECLINE'])
  response!: 'SNOOZE' | 'DECLINE';
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Enter the brand name.' })
  @MaxLength(255, { message: 'The brand name is too long (255 characters max).' })
  name?: string;

  @IsOptional()
  @IsIn(['SHARED', 'PER_OUTLET'])
  billSeriesMode?: 'SHARED' | 'PER_OUTLET';

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'The bill series prefix is too long (30 characters max).' })
  billSeriesPrefix?: string;
}

export class AddOutletDto {
  /** The part after the brand name, e.g. "Kozhikode - Mavoor Road"; the outlet is named "<Brand> - <label>". */
  @IsString()
  @IsNotEmpty({ message: 'Enter the outlet name or area.' })
  @MaxLength(100, { message: 'The outlet label is too long (100 characters max).' })
  outletLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @IsString()
  @IsNotEmpty({ message: 'Each outlet needs its own phone number.' })
  @MaxLength(50, { message: 'The phone is too long (50 characters max).' })
  phone!: string;

  @IsEmail({}, { message: 'Each outlet needs its own valid email.' })
  @MaxLength(255, { message: 'The email is too long (255 characters max).' })
  email!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The city is too long (100 characters max).' })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'The state is too long (100 characters max).' })
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'The pincode is too long (20 characters max).' })
  postalCode?: string;
}

export class UpdateOutletDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter the outlet name or area.' })
  @MaxLength(100, { message: 'The outlet label is too long (100 characters max).' })
  outletLabel!: string;
}

export class ReassignBillDto {
  @IsUUID(undefined, { message: 'outletId must be a valid business ID' })
  outletId!: string;
}

export class BrandStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}
