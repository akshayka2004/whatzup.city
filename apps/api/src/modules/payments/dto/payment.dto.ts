import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethodEnum {
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
}
