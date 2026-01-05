// // src/utils/generate-user-id.ts
// import { nanoid } from 'nanoid';

// export function generateUserId(userRole: UserRole): string {
//   const rolePrefix =
//     {
//       [UserRole.SUPER_ADMIN]: 'SUP',
//       [UserRole.PLATFORM_ADMIN]: 'PADM',
//       [UserRole.PLATFORM_MANAGER]: 'PMGR',
//       [UserRole.PLATFORM_CUSTOMER]: 'PCUS',
//       [UserRole.STORE_ADMIN]: 'SADM',
//       [UserRole.STORE_MANAGER]: 'SMGR',
//       [UserRole.STORE_STAFF]: 'SSTF',
//       [UserRole.STORE_EDITOR]: 'SEDR',
//       [UserRole.STORE_CUSTOMER]: 'SCUS',
//     }[userRole] || 'USR';

//   const uniquePart = nanoid(15).toUpperCase();

//   return `${rolePrefix}-${uniquePart}`;
// }
