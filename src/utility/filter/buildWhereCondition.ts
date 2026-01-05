// // src/utils/user-filter.util.ts

// import { Prisma, UserRole, AccountStatus } from '@prisma/client';

// type UserFilters = {
//   search?: string;
//   role?: UserRole;
//   status?: AccountStatus;
//   isVerified?: boolean;
// };

// export function buildUserWhereCondition(
//   filters: UserFilters,
// ): Prisma.UserWhereInput {
//   const { search, role, status, isVerified } = filters;

//   const where: Prisma.UserWhereInput = {};

//   if (search) {
//     where.OR = [
//       { fullName: { contains: search, mode: 'insensitive' } },
//       { email: { contains: search, mode: 'insensitive' } },
//       { phone: { contains: search, mode: 'insensitive' } },
//       { nationality: { contains: search, mode: 'insensitive' } },
//       { address: { contains: search, mode: 'insensitive' } },
//     ];
//   }

//   if (role) {
//     where.role = role;
//   }

//   if (status) {
//     where.status = status;
//   }

//   if (isVerified !== undefined) {
//     where.isVerified = isVerified;
//   }

//   return where;
// }
