import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { CreateAiAssistantDto } from './dto/create-ai-assistant.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('ai')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('/chat')
  create(@Body() userChat: CreateAiAssistantDto) {
    const chat = this.aiAssistantService.create(userChat);
    return chat;
  }
  @Post('/analyze')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ title: string }> {
    if (!file) throw new BadRequestException('No image file provided');
    const title = await this.aiAssistantService.getProductTitle(file);
    return { title };
  }
}
