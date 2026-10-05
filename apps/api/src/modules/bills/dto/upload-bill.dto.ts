import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UploadBillDto {
  @IsUUID(undefined, { message: 'businessId must be a valid business ID' })
  businessId!: string;

  @IsNumber({}, { message: 'Enter the bill amount as a number.' })
  @Min(1, { message: 'The bill amount must be at least 1.' })
  @Max(10_000_000, { message: 'The bill amount is too large.' })
  amount!: number;

  @IsDateString({}, { message: 'Enter the bill date.' })
  billDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'Attach a photo of the bill.' })
  @MaxLength(2000, { message: 'The bill image reference is too long.' })
  billImage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'The description is too long (1000 characters max).' })
  description?: string;

  /** The invoice number printed on the bill; powers duplicate detection and bill-series matching. */
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'The bill number is too long (60 characters max).' })
  billNumber?: string;
}
