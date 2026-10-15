import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const PAYMENT_SORT_FIELDS = [
  'createdAt',
  'eventTimestamp',
  'amount',
] as const;
export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];

export class ListPaymentWebhooksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(PAYMENT_SORT_FIELDS)
  sortBy: PaymentSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
