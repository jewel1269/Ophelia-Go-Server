import { forwardRef, Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/common/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ActivityLogsController],
  providers: [JwtRefreshGuard, RolesGuard, ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
