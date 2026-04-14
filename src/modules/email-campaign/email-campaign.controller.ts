import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmailCampaignService } from './email-campaign.service';
import { SendBulkCampaignDto, SendSingleEmailDto } from './dto/send-campaign.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('email-campaign')
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class EmailCampaignController {
  constructor(private readonly service: EmailCampaignService) {}

  /** GET /email-campaign/audience-counts */
  @Get('audience-counts')
  getAudienceCounts() {
    return this.service.getAudienceCounts();
  }

  /** GET /email-campaign/stats */
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  /** GET /email-campaign/logs */
  @Get('logs')
  getLogs(@Query('limit') limit?: string) {
    return this.service.getLogs(limit ? Number(limit) : 20);
  }

  /** POST /email-campaign/send-single */
  @Post('send-single')
  sendSingle(@Body() dto: SendSingleEmailDto) {
    return this.service.sendSingle(dto);
  }

  /** POST /email-campaign/send-bulk */
  @Post('send-bulk')
  sendBulk(@Body() dto: SendBulkCampaignDto) {
    return this.service.sendBulk(dto);
  }
}
