import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RsvpDto {
  @ApiProperty({ required: false, description: 'Names of guests to bring (each gets a ticket)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  guests?: string[];

  @ApiProperty({
    required: false,
    description: 'Where the visitor came from (home, search, share, qr...)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;

  @ApiProperty({ required: false, description: 'Same key on a retry returns the same tickets' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;

  @ApiProperty({ required: false, description: 'Ticket type, on events that sell tiers' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tier?: string;
}

export class CancelTicketsDto {
  @ApiProperty({
    required: false,
    description: "Tickets to cancel; all of the caller's if omitted",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  ticketIds?: string[];
}

export class WaitlistDto {
  @ApiProperty({ required: false, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  seats?: number;

  @ApiProperty({ required: false, description: 'Ticket type, on events that sell tiers' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tier?: string;
}

/** Host settings. null clears an optional value; leaving a field out keeps it. */
export class BookingSettingsDto {
  @ApiProperty({ required: false, enum: ['NONE', 'RSVP'] })
  @IsOptional()
  @IsIn(['NONE', 'RSVP'])
  bookingMode?: 'NONE' | 'RSVP';

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  capacity?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  rsvpOpensAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  rsvpClosesAt?: string | null;

  @ApiProperty({ required: false, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxPerUser?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 168 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  cancelCutoffHours?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  venueCapacity?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  minAge?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bookingNote?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  checkInOpensAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  checkInClosesAt?: string | null;

  // ── payments (see EventTicketsService.paymentSettings for the rules) ──

  @ApiProperty({ required: false, description: 'Host confirms they take UPI payments' })
  @IsOptional()
  @IsBoolean()
  payEnabled?: boolean;

  @ApiProperty({ required: false, nullable: true, example: 'name@bank' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payUpiId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  payPhone?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Name on the UPI account' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payeeName?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Link to the uploaded QR photo' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  payQrImage?: string | null;

  @ApiProperty({ required: false, minimum: 1, maximum: 72 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72)
  payWindowHours?: number;
}

export class CreateCrewPassesDto {
  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 50,
    description: 'How many passes to create',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;

  @ApiProperty({ required: false, description: 'One label per pass (overrides count)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  labels?: string[];

  @ApiProperty({ required: false, description: 'Used with count: "Gate" gives Gate 1, Gate 2...' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  prefix?: string;

  @ApiProperty({ required: false, enum: ['SCAN', 'DESK'] })
  @IsOptional()
  @IsIn(['SCAN', 'DESK'])
  level?: 'SCAN' | 'DESK';

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxDevices?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ required: false, description: 'Where the volunteer is posted' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  place?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

/** A host edits a volunteer's pass: who they are, where they are posted, how to reach them. */
export class UpdateCrewPassDto {
  @ApiProperty({ required: false, description: "The volunteer's name" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;

  @ApiProperty({ required: false, description: 'Place allocated; empty clears it' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  place?: string;

  @ApiProperty({ required: false, description: '10-digit mobile; empty clears it' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ required: false, description: 'Empty clears it' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ required: false, enum: ['SCAN', 'DESK'] })
  @IsOptional()
  @IsIn(['SCAN', 'DESK'])
  level?: 'SCAN' | 'DESK';

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxDevices?: number;
}

export class MessageAttendeesDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body!: string;
}

export class DecisionDto {
  @ApiProperty({ required: false, description: 'Required when rejecting' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

/** Proof the attendee sends after paying. */
export class SubmitProofDto {
  @ApiProperty({ description: 'UPI reference (UTR) from the payment app' })
  @IsString()
  @MinLength(10)
  @MaxLength(40)
  utr!: string;

  @ApiProperty({ required: false, description: 'Where the payment screenshot was uploaded' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  proofBucket?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  proofPath?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

/** The host's answer to a payment they cannot approve. */
export class RejectPaymentDto {
  @ApiProperty({ description: 'Shown to the attendee' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;

  @ApiProperty({
    required: false,
    description: 'true: attendee may send corrected proof. false: seat is released.',
  })
  @IsOptional()
  @IsBoolean()
  allowResubmit?: boolean;
}

export class ScanLoginDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({
    description: 'Random id the phone keeps, so a pass can be limited to a few devices',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  deviceId!: string;
}

export class ScanQrDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  qr!: string;
}

export class ScanCodeDto {
  @ApiProperty({ description: 'The short code printed under the QR' })
  @IsString()
  @MaxLength(12)
  code!: string;
}

export class ScanTicketDto {
  @ApiProperty()
  @IsUUID()
  ticketId!: string;
}
