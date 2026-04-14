import { Module } from '@nestjs/common';
import { EmailCampaignController } from './email-campaign.controller';
import { EmailCampaignService } from './email-campaign.service';
import { PrismaModule } from 'src/common/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { EmailService } from 'src/services/email.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmailCampaignController],
  providers: [EmailCampaignService, EmailService, JwtRefreshGuard, RolesGuard],
})
export class EmailCampaignModule {}
