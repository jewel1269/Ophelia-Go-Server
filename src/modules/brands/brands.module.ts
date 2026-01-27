import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard, JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
  providers: [BrandsService, JwtAuthGuard, JwtRefreshGuard, RolesGuard],
})
export class BrandsModule {}
