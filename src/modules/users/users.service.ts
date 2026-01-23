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
import { Prisma } from '@prisma/client';
import { CreateAddressDto } from './dto/user-address.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
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
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
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
    console.log(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Logout successful' };
  }

  async findAll({
    search,
    page,
    limit,
  }: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              email: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    return user;
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
}
