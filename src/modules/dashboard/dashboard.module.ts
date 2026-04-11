import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, JwtRefreshGuard, RolesGuard],
})
export class DashboardModule {}
