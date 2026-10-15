import { Injectable } from '@nestjs/common';
import { Payments } from '@prisma/client';
import { CreatePaymentWebhookDto } from '../dto/create-payment-webhook.dto.js';
import { ListPaymentWebhooksQueryDto } from '../dto/list-payment-webhooks-query.dto.js';
import { PaymentWebhooksRepository } from '../repositories/payment-webhooks.repository.js';

export interface PaymentWebhookResult {
  eventId: string;
  duplicate: boolean;
  payment: Payments | null;
}

export interface PaginatedPaymentWebhooks {
  data: Payments[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sortBy: string;
    sortOrder: string;
  };
}

@Injectable()
export class PaymentWebhooksService {
  constructor(private readonly repository: PaymentWebhooksRepository) {}

  async create(payload: CreatePaymentWebhookDto): Promise<PaymentWebhookResult> {
    try {
      const payment = await this.repository.create(payload);
      return { eventId: payment.eventId, duplicate: false, payment };
    } catch (error) {
      // The unique index on eventId is the idempotency guarantee: concurrent
      // deliveries race on the insert and every loser lands here.
      if (isUniqueConstraintError(error)) {
        const existing = await this.repository.findByEventId(payload.eventId);
        return { eventId: payload.eventId, duplicate: true, payment: existing };
      }

      throw error;
    }
  }

  async findAll(
    query: ListPaymentWebhooksQueryDto,
  ): Promise<PaginatedPaymentWebhooks> {
    const { items, total } = await this.repository.findPage(query);
    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    };
  }
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}