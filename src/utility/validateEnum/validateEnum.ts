import { BadRequestException } from '@nestjs/common';

export function validateEnumOrBoolean<T extends object>(
  value: any,
  enumObj: T | 'boolean',
  fieldName: string,
) {
  if (value === undefined || value === null) return;

  if (enumObj === 'boolean') {
    // Accept true/false strings or booleans
    if (value === true || value === false) return;

    if (value === 'true') return true;
    if (value === 'false') return false;

    throw new BadRequestException(`Invalid ${fieldName} value`);
  }

  // Normal enum validation
  if (!Object.values(enumObj).includes(value)) {
    throw new BadRequestException(`Invalid ${fieldName} value`);
  }

  return value as T[keyof T];
}
