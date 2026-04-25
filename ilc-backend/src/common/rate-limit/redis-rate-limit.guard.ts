import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

import { RATE_LIMIT_META_KEY, type RateLimitSpec } from './rate-limit.decorator';

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private redis: Redis;

  constructor(private reflector: Reflector) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const spec = this.reflector.get<RateLimitSpec>(RATE_LIMIT_META_KEY, context.getHandler());
    if (!spec) return true;

    const req = context.switchToHttp().getRequest();
    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
    const userId = req.user?.userId ?? 'anon';
    const key = `rl:${spec.key}:${userId}:${ip}`;

    const value = await this.redis.incr(key);
    if (value === 1) {
      await this.redis.expire(key, spec.windowSec);
    }
    if (value > spec.limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
