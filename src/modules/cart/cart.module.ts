import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'src/common/database/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CartController],
  providers: [CartService, JwtRefreshGuard],
})
export class CartModule {}
