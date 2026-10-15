import { Injectable } from '@nestjs/common';
import { Payments } from '@prisma/client';
import { CreatePaymentWebhookDto } from '../dto/create-payment-webhook.dto.js';
import { ListPaymentWebhooksQueryDto } from '../dto/list-payment-webhooks-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentWebhooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(payload: CreatePaymentWebhookDto): Promise<Payments> {
    return this.prisma.payments.create({
      data: {
        ...payload,
        eventTimestamp: new Date(payload.eventTimestamp),
      },
    });
  }

  findByEventId(eventId: string): Promise<Payments | null> {
    return this.prisma.payments.findUnique({ where: { eventId } });
  }

  async findPage(
    query: ListPaymentWebhooksQueryDto,
  ): Promise<{ items: Payments[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        // id tiebreaker keeps page boundaries stable when sort values are equal
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: query.sortOrder }],
      }),
      this.prisma.payments.count(),
    ]);
    return { items, total };
  }
}