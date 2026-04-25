import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const v = await this.redis.get(key);
    if (!v) return null;
    return JSON.parse(v) as T;
  }

  async setJson(key: string, value: unknown, ttlSec: number) {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSec);
  }
}

