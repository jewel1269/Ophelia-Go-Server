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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('/chat')
  @ApiOperation({
    summary: 'Chat with the AI assistant ',
    description:
      'Public route. Sends a message to the AI assistant and receives a response. Typically used by CUSTOMERs on the storefront.',
  })
  @ApiBody({ type: CreateAiAssistantDto })
  @ApiResponse({ status: 201, description: 'AI assistant response' })
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
  @ApiOperation({
    summary: 'Analyze an image and generate a product title ',
    description:
      'Public route. Uploads an image (max 10MB) and uses AI to generate a suggested product title. Typically used by ADMIN while creating products.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Product image file (max 10MB, image/* only)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI-generated product title',
    schema: {
      example: { title: 'Classic Red Cotton T-Shirt' },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing image file' })
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ title: string }> {
    if (!file) throw new BadRequestException('No image file provided');
    const title = await this.aiAssistantService.getProductTitle(file);
    return { title };
  }
}
