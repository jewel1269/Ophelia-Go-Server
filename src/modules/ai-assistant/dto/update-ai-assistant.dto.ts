import { PartialType } from '@nestjs/mapped-types';
import { CreateAiAssistantDto } from './create-ai-assistant.dto';

export class UpdateAiAssistantDto extends PartialType(CreateAiAssistantDto) {}
