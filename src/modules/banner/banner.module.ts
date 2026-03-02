import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard, JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [BannerController],
  providers: [BannerService, JwtAuthGuard, JwtRefreshGuard, RolesGuard],
})
export class BannerModule {}
