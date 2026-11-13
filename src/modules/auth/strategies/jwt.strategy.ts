import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/sequelize';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../../database/models/user.model';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {
    const cookieName =
      configService.get<string>('COOKIE_NAME') || 'sonateca_access_token';

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.[cookieName] || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'sonateca_access_super_secret_key_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findByPk(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('INVALID_OR_INACTIVE_USER');
    }
    return {
      id: user.id,
      name: user.name,
      dni: user.dni,
      producerName: user.producerName,
      email: user.email,
      whatsapp: user.whatsapp,
      role: user.role,
    };
  }
}
