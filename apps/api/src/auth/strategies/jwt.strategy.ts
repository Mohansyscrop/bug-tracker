import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract JWT from httpOnly cookie
        (req: Request) => {
          return req?.cookies?.access_token ?? null;
        },
        // Fallback to Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'fallback-secret',
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.auth.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException('User not found or deleted');
    return user;
  }
}
