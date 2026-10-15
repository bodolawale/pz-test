import { CreatePaymentWebhookDto } from '../dto/create-payment-webhook.dto.js';
import { PaymentWebhooksRepository } from '../repositories/payment-webhooks.repository.js';
import { PaymentWebhooksService } from './payment-webhooks.service.js';

describe('PaymentWebhooksService', () => {
  const repository = {
    create: vi.fn(),
    findByEventId: vi.fn(),
    findPage: vi.fn(),
  };
  const service = new PaymentWebhooksService(
    repository as unknown as PaymentWebhooksRepository,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a created payment for a new event', async () => {
    const payment = { ...validPayload, id: 'payment-id' };
    repository.create.mockResolvedValue(payment);

    await expect(service.create(validPayload)).resolves.toEqual({
      eventId: validPayload.eventId,
      duplicate: false,
      payment,
    });
  });

  it('returns the stored record for Prisma unique constraint errors', async () => {
    const existing = { ...validPayload, id: 'existing-id' };
    repository.create.mockRejectedValue({ code: 'P2002' });
    repository.findByEventId.mockResolvedValue(existing);

    await expect(service.create(validPayload)).resolves.toEqual({
      eventId: validPayload.eventId,
      duplicate: true,
      payment: existing,
    });
    expect(repository.findByEventId).toHaveBeenCalledWith(validPayload.eventId);
  });

  it('propagates unexpected repository errors', async () => {
    const error = new Error('Database unavailable');
    repository.create.mockRejectedValue(error);

    await expect(service.create(validPayload)).rejects.toBe(error);
  });

  it('returns a page of payments with pagination metadata', async () => {
    const items = [{ ...validPayload, id: 'payment-id' }];
    repository.findPage.mockResolvedValue({ items, total: 41 });

    await expect(
      service.findAll({
        page: 2,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual({
      data: items,
      meta: {
        page: 2,
        limit: 20,
        total: 41,
        totalPages: 3,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    });
  });
});

const validPayload: CreatePaymentWebhookDto = {
  eventId: 'evt_01J9PAYMENT123',
  paymentReference: 'PAY-2026-000001',
  status: 'SUCCESS',
  eventTimestamp: '2026-10-14T10:30:00.000Z',
  amount: 100000,
  currency: 'NGN',
  description: 'Pay up now',
  customerName: 'John Doe',
};