import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [ReviewController],
  providers: [ReviewService, JwtRefreshGuard, RolesGuard],
})
export class ReviewModule {}
