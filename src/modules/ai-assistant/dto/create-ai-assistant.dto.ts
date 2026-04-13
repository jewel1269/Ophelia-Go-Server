import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ChatPartDto {
  @IsString()
  text: string;
}

export class ChatHistoryItemDto {
  @IsString()
  role: 'user' | 'model';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatPartDto)
  parts: ChatPartDto[];
}

export class CreateAiAssistantDto {
  @ApiProperty({
    description: 'The user message to send to the AI assistant',
    example: 'আমি একটি কুর্তি কিনতে চাই, বাজেট ৮০০ টাকা',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Logged-in user ID (required for placing orders)',
    example: 'd1e2f3a4-1234-4567-89ab-cdef01234567',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Full conversation history for context continuity',
    type: [ChatHistoryItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
