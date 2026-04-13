import { LogSource, LogType } from '@prisma/client';

export interface CreateLogDto {
  /** The action identifier — uppercase snake_case e.g. "USER_LOGIN", "CREATE_ORDER" */
  action: string;
  /** Human-readable description */
  message: string;
  /** INFO (default) | WARNING | DANGEROUS */
  type?: LogType;
  /** Where the action originated */
  source?: LogSource;
  /** The user who performed the action (optional for system events) */
  userId?: string;
  /** The affected entity's ID (orderId, productId, etc.) */
  entityId?: string;
  /** Any extra data to store */
  metadata?: Record<string, any>;
}
