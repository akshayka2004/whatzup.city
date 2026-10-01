import { IsString, IsNotEmpty, IsUUID, IsInt, Min, Max, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class CreateDiscountDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter the item or product this discount applies to.' })
  @MaxLength(255, { message: 'The item name is too long (255 characters max).' })
  itemName!: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'productId must be a valid product ID' })
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'The description is too long (1000 characters max).' })
  description?: string;

  @IsInt({ message: 'The maximum discount must be a whole number.' })
  @Min(1, { message: 'The maximum discount must be at least 1%.' })
  @Max(90, { message: 'The maximum discount cannot exceed 90%.' })
  maxDiscountPercent!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RedeemSpinDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter the ticket code.' })
  @MaxLength(30)
  code!: string;
}
