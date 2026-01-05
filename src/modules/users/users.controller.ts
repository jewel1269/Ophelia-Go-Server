import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UsePipes,
  ValidationPipe,
  Delete,
  Res,
  UseGuards,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as authGuard from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GetQueryDto } from 'src/common/constants/query/query-dto';
import { CreateAddressDto } from './dto/user-address.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/register')
  @UsePipes(new ValidationPipe())
  create(@Body() registerData: CreateUserDto) {
    const user = this.usersService.create(registerData);
    return user;
  }

  @Post('/login')
  @UsePipes(new ValidationPipe())
  async login(
    @Body() loginData: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.usersService.login(loginData);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user, accessToken, refreshToken };
  }

  @Post('/logout')
  @UseGuards(authGuard.JwtRefreshGuard)
  async logout(
    @CurrentUser() user: authGuard.JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.logout(user.sub);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Logout successful' };
  }

  @Get('/customers')
  async findAll(@Query() query: GetQueryDto) {
    console.log('Query received:', query);
    const users = await this.usersService.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return users;
  }

  @Get('/single/:id')
  findOne(@Param('id') id: string) {
    const user = this.usersService.findOne(id);
    return user;
  }

  @Get('/profile')
  @UseGuards(authGuard.JwtRefreshGuard)
  profile(@CurrentUser() user: authGuard.JwtPayload) {
    const profile = this.usersService.profile(user.sub);
    return profile;
  }

  @Patch('/update/:id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('/single/:id')
  remove(@Param('id') id: string) {
    const deleteUser = this.usersService.deleteOne(id);
    return deleteUser;
  }

  @Post('/address')
  @UseGuards(authGuard.JwtRefreshGuard)
  createAddress(
    @CurrentUser() user: authGuard.JwtPayload,
    @Body() addressDto: CreateAddressDto,
  ) {
    const userId = user.sub;
    console.log('User ID:', userId, addressDto);
    const address = this.usersService.createAddress(userId, addressDto);
    return address;
  }
}
