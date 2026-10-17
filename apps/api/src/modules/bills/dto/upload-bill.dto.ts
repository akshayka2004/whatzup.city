import { BILL_ORDER_CHANNELS, BILL_PAYMENT_MODES, DELIVERY_PARTNERS } from '@saas/types';
import {
  IsDateString,
  IsIn,
  ValidateIf,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  /** How the customer bought: in the shop, takeaway, or through a delivery app. */
  @IsIn(BILL_ORDER_CHANNELS as unknown as string[], {
    message: 'Choose how you bought: in-store, takeaway or a delivery app.',
  })
  orderChannel!: string;

  /** How it was paid. Not asked for delivery-app orders. */
  @ValidateIf((o) => o.orderChannel !== 'DELIVERY')
  @IsIn(BILL_PAYMENT_MODES as unknown as string[], {
    message: 'Choose how you paid: cash, UPI, debit card or credit card.',
  })
  paymentMode?: string;

  /** Delivery orders: which app. */
  @ValidateIf((o) => o.orderChannel === 'DELIVERY')
  @IsIn(DELIVERY_PARTNERS as unknown as string[], {
    message: 'Choose the delivery app: Swiggy, Zomato, Plenti or other.',
  })
  deliveryPartner?: string;

  /** The typed name when the delivery app is "Other". */
  @ValidateIf((o) => o.orderChannel === 'DELIVERY' && o.deliveryPartner === 'OTHER')
  @IsString()
  @IsNotEmpty({ message: 'Enter the name of the delivery app.' })
  @MaxLength(60, { message: 'The delivery app name is too long (60 characters max).' })
  deliveryPartnerName?: string;
}
