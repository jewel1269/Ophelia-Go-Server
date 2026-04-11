import { User } from '@prisma/client';

export function excludePassword(user: User): Omit<User, 'password'> {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
