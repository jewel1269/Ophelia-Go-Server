import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  role: Role;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractAccessToken(request);

    if (!token) throw new UnauthorizedException('Access token not found');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET as string,
      });
      request.user = payload;
    } catch (err: any) {
      console.log(err);
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private extractAccessToken(request: Request): string | undefined {
    const authHeader = request.headers['authorization'];
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') return token;
    }
    return undefined;
  }
}

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractRefreshToken(request);

    if (!token) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET as string,
      });
      request.user = payload;
      request.refreshToken = token;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private extractRefreshToken(request: Request): string | undefined {
    if (typeof request.cookies?.refreshToken === 'string') {
      return request.cookies.refreshToken;
    }
    return undefined;
  }
}
