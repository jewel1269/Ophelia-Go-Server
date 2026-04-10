import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAiAssistantDto {
  @ApiProperty({
    description: 'User message sent to the AI assistant',
    example: 'What are your best selling t-shirts this season?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Chat session id (used to keep conversation history)',
    example: 'chat_01H8Z2Y3X4W5V6U7T8S9',
  })
  @IsString()
  @IsNotEmpty()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'ID of the user sending the message',
    example: 'd1e2f3a4-1234-4567-89ab-cdef01234567',
  })
  @IsString()
  @IsNotEmpty()
  userId?: string;
}
