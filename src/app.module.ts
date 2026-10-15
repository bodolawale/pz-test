import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './controllers/app.controller.js';
import { PaymentWebhooksController } from './controllers/payment-webhooks.controller.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PaymentWebhooksRepository } from './repositories/payment-webhooks.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { AppService } from './services/app.service.js';
import { PaymentWebhooksService } from './services/payment-webhooks.service.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? '',
      appSecret: process.env.OBSERVE_APP_SECRET ?? '',
      runtimeMetrics: !Boolean(process.versions?.['webcontainer']),
      serviceId: 'nest-typescript-starter',
    }),
    PrismaModule,
  ],
  controllers: [AppController, PaymentWebhooksController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    AppService,
    UserRepository,
    PaymentWebhooksRepository,
    PaymentWebhooksService,
  ],
})
export class AppModule {}
