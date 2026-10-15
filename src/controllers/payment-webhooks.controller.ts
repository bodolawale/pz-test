import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreatePaymentWebhookDto } from '../dto/create-payment-webhook.dto.js';
import { ListPaymentWebhooksQueryDto } from '../dto/list-payment-webhooks-query.dto.js';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { PaymentWebhooksService } from '../services/payment-webhooks.service.js';

@Controller('webhooks/payments')
@UseGuards(ApiKeyGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PaymentWebhooksController {
  constructor(private readonly paymentWebhooksService: PaymentWebhooksService) {}

  @Post()
  async create(
    @Body() payload: CreatePaymentWebhookDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.paymentWebhooksService.create(payload);
    response.status(
      result.duplicate ? HttpStatus.OK : HttpStatus.CREATED,
    );
    return result;
  }

  @Get()
  findAll(@Query() query: ListPaymentWebhooksQueryDto) {
    return this.paymentWebhooksService.findAll(query);
  }
}