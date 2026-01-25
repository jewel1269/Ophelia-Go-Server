import { PrismaModule } from './../../common/database/prisma.module';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/common/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/utility/generateTokens/generateTokens';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryService } from 'src/storage/cloudinary/cloudinary.service';
import { CloudinaryProvider } from 'src/storage/cloudinary/cloudinary.provider';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    JwtService,
    TokenService,
    CloudinaryService,
    CloudinaryProvider,
  ],
})
export class UsersModule {}
