import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

// Token Payload Interfaces
export interface TokenPayload {
  sub: string;
  email?: string;
  phone?: string;
  name?: string;
  role: string;
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  tokenVersion?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  name?: string;
  platformRoles?: string[];
  restaurantAccess?: {
    restaurantId: number;
    roles: string[];
  }[];
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class TokenService {
  private readonly accessTokenSecret: jwt.Secret;
  private readonly refreshTokenSecret: jwt.Secret;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor() {
    // Separate secrets for access and refresh tokens
    this.accessTokenSecret =
      process.env.JWT_ACCESS_SECRET || 'access-secret-key-change-in-production';
    this.refreshTokenSecret =
      process.env.JWT_REFRESH_SECRET ||
      'refresh-secret-key-change-in-production';

    this.accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access token (short-lived, contains user info and permissions)
   */
  generateAccessToken(payload: TokenPayload): string {
    const accessPayload: AccessTokenPayload = {
      ...payload,
      type: 'access',
    };

    return jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token (long-lived, minimal data)
   */
  generateRefreshToken(payload: {
    sub: string;
    role: string;
    tokenVersion?: number;
  }): string {
    const refreshPayload = {
      ...payload,
      type: 'refresh',
    };

    return jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: TokenPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify access token
   */
  //   verifyAccessToken(token: string): DecodedToken {
  //     try {
  //       const decoded = jwt.verify(token, this.accessTokenSecret, {
  //         algorithms: ['HS256'],
  //       }) as DecodedToken;

  //       if (decoded.type !== 'access') {
  //         throw new UnauthorizedException('Invalid token type');
  //       }

  //       return decoded;
  //     } catch (error) {
  //       if (error instanceof jwt.TokenExpiredError) {
  //         throw new UnauthorizedException('Access token expired');
  //       }
  //       if (error instanceof jwt.JsonWebTokenError) {
  //         throw new UnauthorizedException('Invalid access token');
  //       }
  //       throw error;
  //     }
  //   }

  //   /**
  //    * Verify refresh token
  //    */
  verifyRefreshToken(
    token: string,
  ): RefreshTokenPayload & { iat: number; exp: number } {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
      }) as RefreshTokenPayload & { iat: number; exp: number };

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  //   /**
  //    * Decode token without verification (useful for debugging)
  //    */
  //   decodeToken(token: string): DecodedToken | null {
  //     try {
  //       return jwt.decode(token) as DecodedToken;
  //     } catch {
  //       return null;
  //     }
  //   }

  //   /**
  //    * Check if token is expired (without throwing error)
  //    */
  //   isTokenExpired(token: string): boolean {
  //     try {
  //       const decoded = this.decodeToken(token);
  //       if (!decoded) return true;

  //       const now = Math.floor(Date.now() / 1000);
  //       return decoded.exp < now;
  //     } catch {
  //       return true;
  //     }
  //   }

  //   /**
  //    * Get token expiration date
  //    */
  //   getTokenExpiration(token: string): Date | null {
  //     const decoded = this.decodeToken(token);
  //     if (!decoded) return null;

  //     return new Date(decoded.exp * 1000);
  //   }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authorization: string | undefined): string | null {
    if (!authorization) return null;

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) return null;

    return token;
  }

  /**
   * Check if user has specific platform role
   */
  hasRole(decoded: DecodedToken, roleSlug: string): boolean {
    return decoded.platformRoles?.includes(roleSlug) ?? false;
  }

  /**
   * Check if user has any of the specified platform roles
   */
  hasAnyRole(decoded: DecodedToken, roleSlugs: string[]): boolean {
    return roleSlugs.some((role) => this.hasRole(decoded, role));
  }

  /**
   * Check if user has access to restaurant
   */
  hasRestaurantAccess(decoded: DecodedToken, restaurantId: number): boolean {
    return (
      decoded.restaurantAccess?.some(
        (access) => access.restaurantId === restaurantId,
      ) ?? false
    );
  }

  /**
   * Check if user has specific role in restaurant
   */
  hasRestaurantRole(
    decoded: DecodedToken,
    restaurantId: number,
    roleSlug: string,
  ): boolean {
    const access = decoded.restaurantAccess?.find(
      (a) => a.restaurantId === restaurantId,
    );
    return access?.roles.includes(roleSlug) ?? false;
  }

  /**
   * Get user's roles in restaurant
   */
  getRestaurantRoles(decoded: DecodedToken, restaurantId: number): string[] {
    const access = decoded.restaurantAccess?.find(
      (a) => a.restaurantId === restaurantId,
    );
    return access?.roles ?? [];
  }
}
