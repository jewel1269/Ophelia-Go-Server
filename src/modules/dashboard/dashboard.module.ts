import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminDashboardController } from './admin/admin-dashboard.controller';
import { AdminDashboardService } from './admin/admin-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, JwtRefreshGuard, RolesGuard],
})
export class DashboardModule {}
