import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ScannerSession } from '../scanner.service';

@Injectable()
export class ScannerAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('SCANNER_TOKEN_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      if (payload.role !== 'SCANNER' || !payload.eventId) {
        throw new UnauthorizedException('INVALID_SCANNER_SESSION');
      }
      request.scannerSession = payload;
      return true;
    } catch {
      throw new UnauthorizedException('INVALID_OR_EXPIRED_SCANNER_TOKEN');
    }
  }
}

export const CurrentScanner = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ScannerSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.scannerSession;
  },
);
