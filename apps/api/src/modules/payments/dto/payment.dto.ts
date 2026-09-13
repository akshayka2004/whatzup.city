import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsBoolean, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethodEnum {
  UPI_QR = 'UPI_QR',
  GPAY = 'GPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  RAZORPAY = 'RAZORPAY',
  CASH = 'CASH',
}

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethodEnum, example: 'RAZORPAY' })
  @IsEnum(PaymentMethodEnum)
  method!: PaymentMethodEnum;

  @ApiProperty({ example: 2999.0 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'pay_ABC123xyz', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionRef?: string;

  @ApiProperty({ example: 'sub-uuid-here', required: false })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiProperty({
    example: '{"bucket":"business-media","path":"payments/x.png"}',
    required: false,
    description: 'Uploaded payment screenshot (QR/UPI proof) for admin review',
  })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiProperty({ example: 'WHTZUP_XL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  packageName?: string;
}

/** Details our office needs to raise the invoice. */
export class BillingProfileDto {
  @ApiProperty({ example: 'Sunrise Hospitality Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  billingName!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  hasGst!: boolean;

  @ApiProperty({ example: '32ABCDE1234F1Z5', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gstin?: string;

  @ApiProperty({ example: 'ABCDE1234F', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  pan?: string;

  @ApiProperty({ example: '45/998-A, MG Road, Ernakulam' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  addressLine!: string;

  @ApiProperty({ example: 'Thiruvananthapuram', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: 'Kerala', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: '695001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  pincode!: string;

  @ApiProperty({ example: 'accounts@sunrise.com' })
  @IsEmail()
  @MaxLength(255)
  invoiceEmail!: string;
}

export class RejectPaymentDto {
  @ApiProperty({ example: 'Screenshot unreadable' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
