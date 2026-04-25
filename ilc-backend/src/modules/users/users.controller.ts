import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/auth/current-user.decorator';
import { JwtAuthGuard } from '@/common/auth/jwt-auth.guard';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() u: { userId: string }) {
    const user = await this.users.findById(u.userId);
    if (!user) return null;
    return {
      id: user.id,
      phoneE164: user.phoneE164 ?? '',
      displayName: user.displayName ?? undefined,
      createdAt: user.createdAt.toISOString(),
      entitlements: { isPremium: false, features: {} },
    };
  }
}
