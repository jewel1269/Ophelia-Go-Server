import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, JwtRefreshGuard, RolesGuard],
})
export class OrdersModule {}
