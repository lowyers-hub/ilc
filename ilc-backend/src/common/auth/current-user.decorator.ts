import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export type JwtUser = { userId: string };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as JwtUser;
});

