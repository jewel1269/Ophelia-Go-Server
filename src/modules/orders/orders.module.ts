import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

// ActivityLogsService is @Global() — no import needed

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, JwtRefreshGuard, RolesGuard],
})
export class OrdersModule {}
