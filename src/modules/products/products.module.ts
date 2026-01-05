import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard, JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [ProductsService, JwtAuthGuard, JwtRefreshGuard, RolesGuard],
})
export class ProductsModule {}
