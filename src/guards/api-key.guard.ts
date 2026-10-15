import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredApiKey = process.env.X_API_KEY;
    const suppliedApiKey = request.header('x-api-key');

    if (
      !configuredApiKey ||
      !suppliedApiKey ||
      !keysMatch(suppliedApiKey, configuredApiKey)
    ) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}

// Hashing equalizes lengths so timingSafeEqual cannot leak the key length.
function keysMatch(supplied: string, configured: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(supplied), digest(configured));
}