import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
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
  packageName?: string;
}

export class RejectPaymentDto {
  @ApiProperty({ example: 'Screenshot unreadable' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
