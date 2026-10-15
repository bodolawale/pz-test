<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Payment webhooks

### Setup

```bash
cp .env.example .env          # then set DATABASE_URL and X_API_KEY
npm install
npx prisma migrate deploy     # applies the Payments table, status enum and unique eventId index
npx prisma generate
npm run start:dev             # http://localhost:3000
```

Every request to `/webhooks/payments` must send the `x-api-key` header matching `X_API_KEY`.

### `POST /webhooks/payments`

```bash
curl -i -X POST http://localhost:3000/webhooks/payments \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your_secret_api_key' \
  -d '{
    "eventId": "evt_01J9PAYMENT123",
    "paymentReference": "PAY-2026-000001",
    "status": "SUCCESS",
    "eventTimestamp": "2026-10-14T10:30:00.000Z",
    "amount": 100000,
    "currency": "NGN",
    "description": "Pay up now",
    "customerName": "John Doe"
  }'
```

| Scenario | Status | Body |
|---|---|---|
| New event saved | `201 Created` | `{ eventId, duplicate: false, payment }` |
| Duplicate `eventId` | `200 OK` | `{ eventId, duplicate: true, payment }` (the originally stored record, even if the new payload differs) |
| Invalid payload | `400 Bad Request` | error body, `message` is an array of field errors |
| Missing or wrong API key | `401 Unauthorized` | error body |
| Unexpected/database error | `500 Internal Server Error` | error body with a generic message (details are logged, never returned) |

All errors share one shape: `{ statusCode, error, message, path, timestamp }`.

Validation rules: `status` must be `PENDING`, `SUCCESS` or `FAILED`; `eventTimestamp` must be ISO 8601; `amount` must be a positive integer in the smallest currency unit (kobo); `currency` must be a 3-letter uppercase code; all string fields are required and non-empty; unknown fields are rejected.

### `GET /webhooks/payments`

```bash
curl 'http://localhost:3000/webhooks/payments?page=1&limit=20&sortBy=createdAt&sortOrder=desc' \
  -H 'x-api-key: your_secret_api_key'
```

| Query param | Default | Allowed |
|---|---|---|
| `page` | `1` | integer ≥ 1 |
| `limit` | `20` | 1 to 100 |
| `sortBy` | `createdAt` | `createdAt`, `eventTimestamp`, `amount` |
| `sortOrder` | `desc` | `asc`, `desc` |

Response: `{ data: Payment[], meta: { page, limit, total, totalPages, sortBy, sortOrder } }`.

### Design notes

- **Idempotency** is enforced by a unique index on `eventId`, not by a read-then-insert check. Concurrent deliveries of the same event race on the insert. One succeeds and the others hit Prisma error `P2002`, which the service turns into a `200` duplicate response with the stored record. The e2e suite fires concurrent deliveries to prove only one row is written.
- **Duplicates return 200, not 409**, because providers retry on non-2xx responses. A 2xx tells them the event is already handled.
- **One record per `eventId`, regardless of content.** The first delivery wins. A later delivery with the same `eventId` is never saved and never updates the stored record, even if its status, amount or other fields differ. The response always returns the original record so the caller can see what was kept. A status change must arrive as a new event with its own `eventId`.
- **Amounts** are stored as integers in kobo to avoid floating-point rounding.
- **Status** is a PostgreSQL enum and **currency** is `CHAR(3)`, so the database enforces the same rules as the DTO.
- **API key comparison** hashes both values and uses a timing-safe compare, so neither the key nor its length leaks through response timing.
- Layers: controller (HTTP, status codes) → service (idempotency logic) → repository (Prisma) with DTOs for input and a global exception filter for consistent errors.

### Tests

```bash
npm test             # unit + HTTP-level controller tests (no database needed)
npm run test:e2e     # full stack against the DATABASE_URL in .env (must be migrated)
```

### Manual testing guide

Start the app, then run the requests below in order. Replace `your_secret_api_key` with the `X_API_KEY` value from your `.env`. Requests 1 and 2 write to the database in `DATABASE_URL`; change the `eventId` in request 1 to create more records.

```bash
npm run start:dev
```

> If `npm run start:dev` or `npm run build` crashes with `ERR_REQUIRE_CYCLE_MODULE`, you are on Node 22.14, which has a bug loading the Nest CLI. Switch to a newer Node 22 release (for example `nvm use 22.23.3`).

**1. New payment** → expect `201 Created`, `duplicate: false`.

```bash
curl -i -X POST http://localhost:3000/webhooks/payments \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your_secret_api_key' \
  -d '{
    "eventId": "evt_01J9PAYMENT123",
    "paymentReference": "PAY-2026-000001",
    "status": "SUCCESS",
    "eventTimestamp": "2026-10-14T10:30:00.000Z",
    "amount": 100000,
    "currency": "NGN",
    "description": "Pay up now",
    "customerName": "John Doe"
  }'
```

**2. Same event, different content** → expect `200 OK`, `duplicate: true`, and the original `SUCCESS` record from request 1.

```bash
curl -i -X POST http://localhost:3000/webhooks/payments \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your_secret_api_key' \
  -d '{
    "eventId": "evt_01J9PAYMENT123",
    "paymentReference": "PAY-2026-000001",
    "status": "FAILED",
    "eventTimestamp": "2026-10-14T11:00:00.000Z",
    "amount": 5000,
    "currency": "NGN",
    "description": "Changed content",
    "customerName": "John Doe"
  }'
```

**3. Invalid payload** → expect `400 Bad Request` with a list of field errors.

```bash
curl -i -X POST http://localhost:3000/webhooks/payments \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your_secret_api_key' \
  -d '{
    "eventId": "   ",
    "paymentReference": "PAY-2026-000002",
    "status": "REFUNDED",
    "eventTimestamp": "yesterday",
    "amount": 10.5,
    "currency": "ngn",
    "description": "Bad data",
    "customerName": "Jane Doe",
    "extraField": true
  }'
```

**4. Missing API key** → expect `401 Unauthorized`.

```bash
curl -i -X POST http://localhost:3000/webhooks/payments \
  -H 'Content-Type: application/json' \
  -d '{"eventId": "evt_no_key"}'
```

**5. List payments (defaults)** → expect `200 OK`, page 1, 20 per page, newest first.

```bash
curl -i http://localhost:3000/webhooks/payments \
  -H 'x-api-key: your_secret_api_key'
```

**6. List with pagination and sorting** → expect `200 OK`, 5 per page, sorted by amount ascending.

```bash
curl -i 'http://localhost:3000/webhooks/payments?page=1&limit=5&sortBy=amount&sortOrder=asc' \
  -H 'x-api-key: your_secret_api_key'
```

**7. Invalid list parameters** → expect `400 Bad Request`.

```bash
curl -i 'http://localhost:3000/webhooks/payments?page=0&limit=500&sortBy=description' \
  -H 'x-api-key: your_secret_api_key'
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
