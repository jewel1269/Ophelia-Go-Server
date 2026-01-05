export function getUserSelectFields(includePassword: boolean = false) {
  const baseSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    isVerified: true,
    photoUrl: true,
    nationality: true,
    address: true,
    role: true,
    status: true,
    lastLogin: true,
    createdAt: true,
    updatedAt: true,
  };

  if (includePassword) {
    return {
      ...baseSelect,
      password: true,
    };
  }

  return baseSelect;
}
