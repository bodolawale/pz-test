import { PaymentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

// Trim before validating so whitespace-only values fail @IsNotEmpty.
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class CreatePaymentWebhookDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  paymentReference!: string;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @IsDateString({ strict: true })
  eventTimestamp!: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amount!: number;

  @Trim()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  customerName!: string;
}
