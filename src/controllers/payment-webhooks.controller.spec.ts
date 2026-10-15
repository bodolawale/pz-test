import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PaymentWebhooksController } from './payment-webhooks.controller.js';
import { HttpExceptionFilter } from '../filters/http-exception.filter.js';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { PaymentWebhooksService } from '../services/payment-webhooks.service.js';

describe('PaymentWebhooksController (HTTP)', () => {
  let app: INestApplication;
  const originalApiKey = process.env.X_API_KEY;
  const paymentWebhooksService = { create: vi.fn(), findAll: vi.fn() };

  beforeEach(async () => {
    process.env.X_API_KEY = 'test-api-key';
    vi.resetAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentWebhooksController],
      providers: [
        ApiKeyGuard,
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        {
          provide: PaymentWebhooksService,
          useValue: paymentWebhooksService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (originalApiKey === undefined) {
      delete process.env.X_API_KEY;
    } else {
      process.env.X_API_KEY = originalApiKey;
    }
  });

  it('rejects a request without the API key', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .send(validPayload)
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'Unauthorized',
      path: '/webhooks/payments',
    });
    expect(paymentWebhooksService.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid API key', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'wrong-api-key')
      .send(validPayload)
      .expect(401);
  });

  it('rejects an invalid payload with field-level messages', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .send({ ...validPayload, amount: -1, status: 'REFUNDED', extra: true })
      .expect(400);

    expect(response.body.error).toBe('Bad Request');
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('amount'),
        expect.stringContaining('status'),
        expect.stringContaining('extra'),
      ]),
    );
    expect(paymentWebhooksService.create).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only string fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .send({ ...validPayload, eventId: '   ', customerName: '\t' })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'eventId should not be empty',
        'customerName should not be empty',
      ]),
    );
    expect(paymentWebhooksService.create).not.toHaveBeenCalled();
  });

  it('trims surrounding whitespace before saving', async () => {
    paymentWebhooksService.create.mockResolvedValue({
      eventId: validPayload.eventId,
      duplicate: false,
      payment: null,
    });

    await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .send({
        ...validPayload,
        eventId: ` ${validPayload.eventId} `,
        currency: 'NGN ',
      })
      .expect(201);

    expect(paymentWebhooksService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: validPayload.eventId,
        currency: 'NGN',
      }),
    );
  });

  it('masks unexpected errors as a 500 without leaking details', async () => {
    paymentWebhooksService.create.mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:5432'),
    );

    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .send(validPayload)
      .expect(500);

    expect(response.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(response.body)).not.toContain('ECONNREFUSED');
  });

  it('creates a payment webhook at the required route', async () => {
    paymentWebhooksService.create.mockResolvedValue({
      eventId: validPayload.eventId,
      duplicate: false,
      payment: { ...validPayload, id: 'payment-id' },
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .send(validPayload)
      .expect(201);

    expect(response.body.duplicate).toBe(false);
  });

  it('acknowledges duplicate events with success', async () => {
    paymentWebhooksService.create.mockResolvedValue({
      eventId: validPayload.eventId,
      duplicate: true,
      payment: null,
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .send(validPayload)
      .expect(200);

    expect(response.body.duplicate).toBe(true);
  });

  it('requires the API key to list payment webhooks', async () => {
    await request(app.getHttpServer()).get('/webhooks/payments').expect(401);
    expect(paymentWebhooksService.findAll).not.toHaveBeenCalled();
  });

  it('lists payment webhooks with default pagination and sorting', async () => {
    paymentWebhooksService.findAll.mockResolvedValue({ data: [], meta: {} });

    await request(app.getHttpServer())
      .get('/webhooks/payments')
      .set('x-api-key', 'test-api-key')
      .expect(200);

    expect(paymentWebhooksService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    );
  });

  it('parses pagination and sorting query parameters', async () => {
    paymentWebhooksService.findAll.mockResolvedValue({ data: [], meta: {} });

    await request(app.getHttpServer())
      .get('/webhooks/payments?page=2&limit=5&sortBy=amount&sortOrder=asc')
      .set('x-api-key', 'test-api-key')
      .expect(200);

    expect(paymentWebhooksService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        sortBy: 'amount',
        sortOrder: 'asc',
      }),
    );
  });

  it('rejects invalid pagination and sorting parameters', async () => {
    await request(app.getHttpServer())
      .get('/webhooks/payments?page=0&limit=500&sortBy=description')
      .set('x-api-key', 'test-api-key')
      .expect(400);

    expect(paymentWebhooksService.findAll).not.toHaveBeenCalled();
  });
});

const validPayload = {
  eventId: 'evt_01J9PAYMENT123',
  paymentReference: 'PAY-2026-000001',
  status: 'SUCCESS',
  eventTimestamp: '2026-10-14T10:30:00.000Z',
  amount: 100000,
  currency: 'NGN',
  description: 'Pay up now',
  customerName: 'John Doe',
};
