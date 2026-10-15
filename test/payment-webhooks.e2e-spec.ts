import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Requires a migrated PostgreSQL database at DATABASE_URL.
describe('Payment webhooks (e2e)', () => {
  const apiKey = 'e2e-test-api-key';
  const originalApiKey = process.env.X_API_KEY;
  const runPrefix = `evt_e2e_${Date.now()}_`;
  let app: INestApplication;
  let prisma: PrismaService;

  const payload = (eventId: string) => ({
    eventId: `${runPrefix}${eventId}`,
    paymentReference: 'PAY-2026-000001',
    status: 'SUCCESS',
    eventTimestamp: '2026-10-14T10:30:00.000Z',
    amount: 100000,
    currency: 'NGN',
    description: 'Pay up now',
    customerName: 'John Doe',
  });

  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', apiKey)
      .send(body as object);

  const countRows = (eventId: string) =>
    prisma.payments.count({ where: { eventId: `${runPrefix}${eventId}` } });

  beforeAll(async () => {
    process.env.X_API_KEY = apiKey;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    // A listening server lets concurrent supertest requests share one socket listener.
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.payments.deleteMany({
      where: { eventId: { startsWith: runPrefix } },
    });
    await app.close();
    if (originalApiKey === undefined) {
      delete process.env.X_API_KEY;
    } else {
      process.env.X_API_KEY = originalApiKey;
    }
  });

  it('persists a new webhook and returns 201', async () => {
    const response = await post(payload('create')).expect(201);

    expect(response.body).toMatchObject({
      eventId: `${runPrefix}create`,
      duplicate: false,
      payment: { amount: 100000, status: 'SUCCESS', currency: 'NGN' },
    });
    expect(await countRows('create')).toBe(1);
  });

  it('acknowledges a redelivered event with 200 without creating a row', async () => {
    await post(payload('redelivery')).expect(201);
    const response = await post(payload('redelivery')).expect(200);

    expect(response.body).toMatchObject({
      duplicate: true,
      payment: { eventId: `${runPrefix}redelivery` },
    });
    expect(await countRows('redelivery')).toBe(1);
  });

  it('keeps the first record when a redelivery has different content', async () => {
    await post(payload('changed')).expect(201);
    const response = await post({
      ...payload('changed'),
      status: 'FAILED',
      amount: 999,
    }).expect(200);

    expect(response.body).toMatchObject({
      duplicate: true,
      payment: { status: 'SUCCESS', amount: 100000 },
    });
    expect(await countRows('changed')).toBe(1);
  });

  it('stores exactly one row for concurrent deliveries of the same event', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => post(payload('concurrent'))),
    );
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses.filter((code) => code === 201)).toHaveLength(1);
    expect(statuses.filter((code) => code === 200)).toHaveLength(9);
    expect(await countRows('concurrent')).toBe(1);
  });

  it('rejects requests with a missing or invalid API key', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/payments')
      .send(payload('unauthorized'))
      .expect(401);
    await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', 'wrong-key')
      .send(payload('unauthorized'))
      .expect(401);

    expect(await countRows('unauthorized')).toBe(0);
  });

  it('rejects invalid payloads with 400', async () => {
    const { amount: _amount, ...missingAmount } = payload('invalid');

    await post(missingAmount).expect(400);
    await post({ ...payload('invalid'), currency: 'naira' }).expect(400);
    await post({ ...payload('invalid'), eventTimestamp: 'yesterday' }).expect(400);

    expect(await countRows('invalid')).toBe(0);
  });

  it('returns the structured error format for malformed JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/payments')
      .set('x-api-key', apiKey)
      .set('content-type', 'application/json')
      .send('{"eventId":')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      path: '/webhooks/payments',
    });
  });

  it('lists saved webhooks with pagination metadata', async () => {
    await post(payload('list')).expect(201);

    const response = await request(app.getHttpServer())
      .get('/webhooks/payments?limit=100&sortBy=createdAt&sortOrder=desc')
      .set('x-api-key', apiKey)
      .expect(200);

    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.some(
        (item: { eventId: string }) => item.eventId === `${runPrefix}list`,
      ),
    ).toBe(true);
  });
});
