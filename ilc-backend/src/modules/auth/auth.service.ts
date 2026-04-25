import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '@/modules/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @InjectRepository(UserEntity) private users: Repository<UserEntity>
  ) {}

  async issueAccessToken(userId: string) {
    return this.jwt.signAsync({ sub: userId });
  }

  async login(args: { phoneE164?: string; email?: string }) {
    const phone = args.phoneE164?.trim() || null;
    const email = args.email?.trim() || null;

    let user: UserEntity | null = null;
    if (phone) user = await this.users.findOne({ where: { phoneE164: phone } });
    if (!user && email) user = await this.users.findOne({ where: { email } });

    if (!user) {
      user = this.users.create({
        phoneE164: phone,
        email,
        displayName: 'User',
      });
      user = await this.users.save(user);
    }

    const accessToken = await this.issueAccessToken(user.id);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      tokens: { accessToken, expiresAt },
      user: {
        id: user.id,
        phoneE164: user.phoneE164 ?? '',
        displayName: user.displayName ?? undefined,
        createdAt: user.createdAt.toISOString(),
        entitlements: { isPremium: false, features: {} },
      },
    };
  }
}
