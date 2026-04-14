import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { PrismaModule } from 'src/common/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CouponController],
  providers: [CouponService, JwtRefreshGuard, RolesGuard],
  exports: [CouponService],
})
export class CouponModule {}
