import { IsBoolean, IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminNotifType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class NotificationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumberString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumberString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: AdminNotifType })
  @IsEnum(AdminNotifType)
  @IsOptional()
  type?: AdminNotifType;

  @ApiPropertyOptional({ example: false })
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
