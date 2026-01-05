// src/types/express.d.ts
import 'express';
import { Role } from '@prisma/client';

declare module 'express' {
  export interface Request {
    cookies: Record<string, string>;
    user?: {
      sub: string;
      email: string;
      role: Role;
      name?: string;
      phone?: string;
    };
    refreshToken?: string;
  }
}
