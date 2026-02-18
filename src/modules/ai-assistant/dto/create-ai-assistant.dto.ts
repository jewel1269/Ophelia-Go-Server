import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAiAssistantDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  chatId?: string;

  @IsString()
  @IsNotEmpty()
  userId?: string;
}
