import { Controller, Post, Body } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { CreateAiAssistantDto } from './dto/create-ai-assistant.dto';

@Controller('ai')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('/chat')
  create(@Body() userChat: CreateAiAssistantDto) {
    const chat = this.aiAssistantService.create(userChat);
    return chat;
  }
}
