import { PrismaModule } from './../../common/database/prisma.module';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/utility/generateTokens/generateTokens';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryService } from 'src/storage/cloudinary/cloudinary.service';
import { CloudinaryProvider } from 'src/storage/cloudinary/cloudinary.provider';

// ActivityLogsService is @Global() — no import needed, injected automatically

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtService,
    TokenService,
    CloudinaryService,
    CloudinaryProvider,
  ],
})
export class UsersModule {}
