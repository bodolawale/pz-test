import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const body =
      exception instanceof HttpException
        ? fromHttpException(exception)
        : this.fromUnexpectedError(exception, request);

    response.status(body.statusCode).json({
      ...body,
      path: request.url,
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponseBody);
  }

  // Database and other unexpected errors are logged but never exposed to clients.
  private fromUnexpectedError(exception: unknown, request: Request) {
    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };
  }
}

function fromHttpException(exception: HttpException) {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return { statusCode, error: exception.name, message: response };
  }

  const { error, message } = response as {
    error?: string;
    message?: string | string[];
  };
  return {
    statusCode,
    error: error ?? exception.name,
    message: message ?? exception.message,
  };
}
