import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LogSource, LogType } from '@prisma/client';

export class LogQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumberString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumberString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: LogType })
  @IsEnum(LogType)
  @IsOptional()
  type?: LogType;

  @ApiPropertyOptional({ enum: LogSource })
  @IsEnum(LogSource)
  @IsOptional()
  source?: LogSource;

  @ApiPropertyOptional({ example: 'USER_LOGIN' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by userId' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Search in message or action' })
  @IsString()
  @IsOptional()
  search?: string;
}
