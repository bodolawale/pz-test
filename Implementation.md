# NestJS Coding Challenge: Payment Webhook Handler

## 1. Overview

Build a simple payment webhook handler using **NestJS, Prisma ORM, and PostgreSQL**.

You are provided with a starter project that already has NestJS, Prisma, and the database connection configured. Fork the repository and implement the requirements below.

**Time limit:** 30 minutes

## 2. Requirements

### Mandatory: Receive and Save Payment Webhooks

Implement the following endpoint:

`POST /webhooks/payments`

The endpoint should:

1. Authenticate requests using an API key supplied through the `x-api-key` HTTP header.
2. Validate the incoming request payload.
3. Save the payment webhook data to PostgreSQL using Prisma.
4. Prevent duplicate webhook events from being processed more than once, using `eventId` as the unique identifier.
5. Return appropriate HTTP status codes and error responses.
6. Organize the code using appropriate NestJS controllers, services, and DTOs.

### Optional: Fetch Payment Webhooks

Implement the following endpoint if time permits:

`GET /webhooks/payments`

The endpoint should retrieve and return all saved payment webhook records.

You may include pagination or sorting if time permits, but these are not required.

## 3. Webhook Payload

The `POST /webhooks/payments` endpoint should accept a JSON payload in the following format:

```json
{
  "eventId": "evt_01J9PAYMENT123",
  "paymentReference": "PAY-2026-000001",
  "status": "SUCCESS",
  "eventTimestamp": "2026-10-14T10:30:00.000Z",
  "amount": 100000,
  "currency": "NGN",
  "description": "Pay up now",
  "customerName": "John Doe"
}
```

### Field descriptions

| Field | Type | Description |
|---|---|---|
| `eventId` | string | Unique identifier for the webhook event |
| `paymentReference` | string | Reference identifying the payment |
| `status` | string | Payment status: `PENDING`, `SUCCESS`, or `FAILED` |
| `eventTimestamp` | ISO 8601 string | Timestamp associated with the event |
| `amount` | number | Payment amount in the smallest currency unit, such as kobo for NGN |
| `currency` | string | Currency code, e.g. `NGN` |
| `description` | string | Description of the payment |
| `customerName` | string | Name of the customer |

For this challenge, assume `100000` NGN represents ₦1,000 when the amount is expressed in kobo.

## 4. API Key Authentication

Authentication should be implemented using an API key stored in an environment variable.

Add the following variable to your `.env` file:

```env
X_API_KEY=your_secret_api_key
```

Every request to the webhook endpoint must include the following header:

```http
x-api-key: your_secret_api_key
```

The application must compare the supplied header value with the configured `X_API_KEY` environment variable.

- Return `401 Unauthorized` if the header is missing or the API key is invalid.

No additional authentication mechanism is required.

## 5. Database and Prisma

Use Prisma ORM for all database operations.

Your implementation should:

- Define an appropriate Prisma model for the payment webhook records.
- Choose suitable data types for each field.
- Handle database errors appropriately.

You may introduce additional fields if they are justified by your design.

## 6. Duplicate Event Handling and Idempotency

Webhook providers may deliver the same event multiple times, so the application must handle duplicate events safely.

Requirements:

- The same `eventId` must not create multiple records.
- Handle duplicate requests gracefully with a documented and consistent response.
- Consider how concurrent requests with the same `eventId` could be handled safely.

You do not need to implement a full distributed event-processing system. Focus on correctness within the scope of this exercise.

## 7. Validation and Error Handling

Use appropriate HTTP status codes. For example:

| Scenario | Expected status |
|---|---|
| Webhook successfully saved | `201 Created` or another documented success response |
| Missing or invalid API key | `401 Unauthorized` |
| Invalid payload | `400 Bad Request` |
| Duplicate event | A consistent, documented response |
| Unexpected server/database error | `500 Internal Server Error` |

The response format is up to you, provided it is consistent and meaningful.

## 8. Optional Enhancements

If you complete the mandatory requirements before the time limit, consider implementing one or more of the following:

- `GET /webhooks/payments` to retrieve saved records.
- Pagination or sorting for the GET endpoint.
- Improved structured error responses.

These enhancements are not required to pass the core challenge.

## 9. Evaluation Criteria

Your solution will be assessed based on:

1. **NestJS architecture:** Appropriate separation of controllers, services, and DTOs.
2. **Prisma and PostgreSQL:** Correct schema design and database interactions.
3. **API security:** Correct implementation of environment-based API key authentication.
4. **Validation:** Appropriate validation of incoming payloads.
5. **Idempotency:** Reliable handling of duplicate webhook events.
6. **Error handling:** Meaningful HTTP status codes and predictable responses.
7. **Code quality:** Readability, maintainability, and sensible design decisions.

We are interested in your reasoning and implementation choices, not just whether the endpoint works for a single request.

## 10. Submission

- Fork the provided starter repository.
- Implement the mandatory requirements.
- Commit and push your changes to your fork.
- Include any schema or migration changes required to run your solution.
- Add brief instructions if any steps are necessary to run or test your implementation.

The optional GET endpoint and other enhancements are welcome but should not take priority over completing the core requirements.

**Time limit: 30 minutes.**


## Project setup

```bash
$ npm install
```

## Compile and run the project - PORT 3000

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev