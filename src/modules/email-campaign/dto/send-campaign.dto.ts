import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export const AUDIENCE_KEYS = [
  'ALL_CUSTOMERS',
  'VIP_CUSTOMERS',
  'INACTIVE_30_DAYS',
  'NEW_CUSTOMERS',
] as const;
export type AudienceKey = (typeof AUDIENCE_KEYS)[number];

export const AUDIENCE_LABELS: Record<AudienceKey, string> = {
  ALL_CUSTOMERS: 'All Registered Customers',
  VIP_CUSTOMERS: 'VIP Customers (3+ Orders)',
  INACTIVE_30_DAYS: 'Inactive Users (Last 30 Days)',
  NEW_CUSTOMERS: 'New Customers (Last 7 Days)',
};

export class SendSingleEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class SendBulkCampaignDto {
  @IsIn(AUDIENCE_KEYS)
  audience: AudienceKey;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
