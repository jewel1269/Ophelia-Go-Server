import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/utility/generateTokens/generateTokens';
import * as bcrypt from 'bcrypt';
import { LogSource, LogType, Prisma } from '@prisma/client';
import { CreateAddressDto } from './dto/user-address.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from 'src/storage/cloudinary/cloudinary.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private cloudinaryService: CloudinaryService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(registerData: CreateUserDto) {
    const { password, email } = registerData;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...registerData,
        password: hashedPassword,
      },
    });
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
    });
    const refreshToken = this.tokenService.generateRefreshToken({
      sub: user.id,
      role: user.role,
      tokenVersion: 1,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    void this.activityLogs.log({
      action: 'USER_REGISTER',
      message: `New user registered: ${user.email}`,
      type: LogType.INFO,
      source: LogSource.AUTH,
      userId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(loginData: CreateUserDto) {
    const { email, password } = loginData;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      void this.activityLogs.log({
        action: 'FAILED_LOGIN',
        message: `Failed login attempt for unknown email: ${email}`,
        type: LogType.DANGEROUS,
        source: LogSource.AUTH,
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      void this.activityLogs.log({
        action: 'FAILED_LOGIN',
        message: `Failed login attempt for ${email} — wrong password`,
        type: LogType.DANGEROUS,
        source: LogSource.AUTH,
        userId: user.id,
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      sub: user.id,
      role: user.role,
      tokenVersion: 1,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedRefreshToken,
      },
    });

    void this.activityLogs.log({
      action: 'USER_LOGIN',
      message: `User logged in: ${user.email}`,
      type: LogType.INFO,
      source: LogSource.AUTH,
      userId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    void this.activityLogs.log({
      action: 'USER_LOGOUT',
      message: `User logged out`,
      type: LogType.INFO,
      source: LogSource.AUTH,
      userId,
    });

    return { message: 'Logout successful' };
  }

  async findAll({
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
    status,
  }: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: string;
    status?: string;
  }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: order.toLowerCase() as Prisma.SortOrder,
        },
        include: {
          addresses: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    if (!id) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
      },
    });
    console.log(user, id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteOne(id: string) {
    if (!id) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.prisma.user.delete({
      where: { id },
    });
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    let avatarUrl = updateUserDto.avatar;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      avatarUrl = uploadResult.secure_url;
    }
    if (!avatarUrl) {
      avatarUrl = updateUserDto.avatar;
    }
    console.log(avatarUrl);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        avatar: avatarUrl,
      },
    });
    return updatedUser;
  }

  async profile(userId: string) {
    if (!userId) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createAddress(userId: string, addressDto: CreateAddressDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const address = await this.prisma.address.create({
      data: {
        ...addressDto,
        userId,
      },
    });
    return address;
  }

  async address(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const formattedAddresses = user.addresses.map((addr) => ({
      addressId: addr.id,
      userName: user.name,
      userPhone: user.phone,
      name: addr.name,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      upazila: addr.upazila,
      country: addr.country,
      addressType: addr.isDefault,
      label: addr.label,
    }));

    return formattedAddresses;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    addressDto: CreateAddressDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: addressDto,
    });
    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const address = await this.prisma.address.delete({
      where: { id: addressId },
    });
    return address;
  }

  async updatePassword(userId: string, body: any) {
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      throw new BadRequestException('oldPassword and newPassword are required');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password updated successfully' };
  }
}
