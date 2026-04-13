import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/common/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => ActivityLogsModule),
  ],
  controllers: [NotificationsController],
  providers: [
    JwtRefreshGuard,
    RolesGuard,
    NotificationsGateway,
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
