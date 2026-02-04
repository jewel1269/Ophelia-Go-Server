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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as authGuard from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GetQueryDto } from 'src/common/constants/query/query-dto';
import { CreateAddressDto } from './dto/user-address.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/register')
  @UsePipes(new ValidationPipe())
  async create(
    @Body() registerData: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.usersService.create(registerData);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { user, accessToken, refreshToken };
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
      sameSite: 'none',
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
      secure: true,
      sameSite: 'none',
      path: '/',
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
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updatedUser = this.usersService.update(id, updateUserDto, file);
    return updatedUser;
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

  @Get('/address')
  @UseGuards(authGuard.JwtRefreshGuard)
  address(@CurrentUser() user: authGuard.JwtPayload) {
    const address = this.usersService.address(user.sub);
    return address;
  }

  @Patch('/address/update/:addressId')
  @UseGuards(authGuard.JwtRefreshGuard)
  updateAddress(
    @CurrentUser() user: authGuard.JwtPayload,
    @Param('addressId') addressId: string,
    @Body() addressDto: CreateAddressDto,
  ) {
    const userId = user.sub;
    console.log('User ID:', userId, addressDto, addressId);
    const address = this.usersService.updateAddress(
      userId,
      addressId,
      addressDto,
    );
    return address;
  }

  @Delete('/address/delete/:addressId')
  @UseGuards(authGuard.JwtRefreshGuard)
  deleteAddress(
    @CurrentUser() user: authGuard.JwtPayload,
    @Param('addressId') addressId: string,
  ) {
    const userId = user.sub;
    const address = this.usersService.deleteAddress(userId, addressId);
    return address;
  }
}
