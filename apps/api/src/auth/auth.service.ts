import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictException('This email belongs to a deactivated account. Please contact an administrator.');
      }
      throw new ConflictException('A user with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.globalRole);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        projectMembers: {
          select: {
            projectId: true,
            projectRole: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      globalRole: user.globalRole,
      createdAt: user.createdAt,
      projectMembers: user.projectMembers,
    };
    const tokens = await this.generateTokens(user.id, user.email, user.globalRole);
    return { user: safeUser, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          globalRole: true,
          createdAt: true,
          projectMembers: {
            select: {
              projectId: true,
              projectRole: true,
              project: { select: { id: true, name: true, key: true } },
            },
          },
        },
      });
      if (!user) throw new UnauthorizedException('User not found');
      const tokens = await this.generateTokens(user.id, user.email, user.globalRole);
      return { user, ...tokens };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        createdAt: true,
        projectMembers: {
          select: {
            projectId: true,
            projectRole: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
    });
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
