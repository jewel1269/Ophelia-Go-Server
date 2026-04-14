import * as jwt from 'jsonwebtoken';

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32chars-minimum';
const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32chars-minimum';

export interface TestUser {
  sub: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'CUSTOMER';
}

export const TEST_ADMIN: TestUser = {
  sub: 'admin-test-id',
  email: 'admin@test.com',
  role: 'ADMIN',
};
export const TEST_CUSTOMER: TestUser = {
  sub: 'customer-test-id',
  email: 'customer@test.com',
  role: 'CUSTOMER',
};
export const TEST_SUPER_ADMIN: TestUser = {
  sub: 'superadmin-test-id',
  email: 'superadmin@test.com',
  role: 'SUPER_ADMIN',
};

/** Generates a signed refresh token (used by JwtRefreshGuard via cookie). */
export const refreshToken = (user: TestUser = TEST_ADMIN): string =>
  jwt.sign(user, REFRESH_SECRET, { expiresIn: '1h' });

/** Generates a signed access token (used by JwtAuthGuard via Bearer header). */
export const accessToken = (user: TestUser = TEST_ADMIN): string =>
  jwt.sign(user, ACCESS_SECRET, { expiresIn: '1h' });

/**
 * Returns the Cookie header string expected by JwtRefreshGuard.
 * Usage: request.set('Cookie', adminCookie())
 */
export const adminCookie = (): string =>
  `refreshToken=${refreshToken(TEST_ADMIN)}`;

export const customerCookie = (): string =>
  `refreshToken=${refreshToken(TEST_CUSTOMER)}`;

export const superAdminCookie = (): string =>
  `refreshToken=${refreshToken(TEST_SUPER_ADMIN)}`;
