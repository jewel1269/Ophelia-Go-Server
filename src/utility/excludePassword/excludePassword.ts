import { User } from '@prisma/client';

export function excludePassword(user: User): Omit<User, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
