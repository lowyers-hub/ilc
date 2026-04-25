import { SetMetadata } from '@nestjs/common';

export type RateLimitSpec = { key: string; limit: number; windowSec: number };

export const RATE_LIMIT_META_KEY = 'rate_limit';

export const RateLimit = (spec: RateLimitSpec) => SetMetadata(RATE_LIMIT_META_KEY, spec);

