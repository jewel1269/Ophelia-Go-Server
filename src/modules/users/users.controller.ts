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
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/register')
  @UsePipes(new ValidationPipe())
  @ApiOperation({
    summary: 'Register a new user ',
    description:
      'Public route. Registers a new user account (CUSTOMER by default) and returns access & refresh tokens. Refresh token is also set as an httpOnly cookie.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
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
  @ApiOperation({
    summary: 'Login ',
    description:
      'Public route. Authenticates a user using email & password and returns access & refresh tokens. Refresh token is also set as an httpOnly cookie.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'rocky.admin@opheliago.com' },
        password: { type: 'string', example: 'StrongPass@123' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user, accessToken, refreshToken };
  }

  @Post('/logout')
  @UseGuards(authGuard.JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout ',
    description:
      'Accessible to any authenticated user (CUSTOMER / ADMIN / SUPER_ADMIN). Clears the refresh token cookie and invalidates the session.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @UseGuards(authGuard.JwtRefreshGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all customers [ADMIN]',
    description:
      'ADMIN only. Returns a paginated list of customers. Supports searching, filtering by status, sorting and pagination.',
  })
  @ApiResponse({ status: 200, description: 'List of customers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(@Query() query: GetQueryDto) {
    const users = await this.usersService.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      order: query.order,
      status: query.status,
    });
    return users;
  }

  @Patch('/password')
  @UseGuards(authGuard.JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update own password ',
    description:
      'Accessible to any authenticated user (CUSTOMER / ADMIN / SUPER_ADMIN). Updates the password of the currently authenticated user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldPassword: { type: 'string', example: 'OldPass@123' },
        newPassword: { type: 'string', example: 'NewStrongPass@456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updatePassword(@CurrentUser() user: authGuard.JwtPayload, @Body() body: any) {
    const updatedPassword = this.usersService.updatePassword(user.sub, body);
    return updatedPassword;
  }

  @Get('/single/:id')
  @ApiOperation({
    summary: 'Get a single user by ID ',
    description: 'Public route. Returns a user by their unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: 'c0a8012e-7f8d-4b3b-9c88-1234567890ab',
  })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    const user = this.usersService.findOne(id);
    return user;
  }

  @Get('/profile')
  @UseGuards(authGuard.JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get own profile ',
    description:
      'Accessible to any authenticated user (CUSTOMER / ADMIN / SUPER_ADMIN). Returns the currently logged in user profile.',
  })
  @ApiResponse({ status: 200, description: 'Profile data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  profile(@CurrentUser() user: authGuard.JwtPayload) {
    const profile = this.usersService.profile(user.sub);
    return profile;
  }

  @Patch('/update/:id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Update a user by ID ',
    description:
      'Updates a user profile. Supports optional avatar upload (multipart/form-data with `file` field).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: 'c0a8012e-7f8d-4b3b-9c88-1234567890ab',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+8801712345678' },
        avatar: { type: 'string', example: 'https://.../avatar.jpg' },
        gender: { type: 'string', example: 'male' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updatedUser = this.usersService.update(id, updateUserDto, file);
    return updatedUser;
  }

  @Delete('/single/:id')
  @ApiOperation({
    summary: 'Delete a user by ID ',
    description: 'Deletes a user account by their unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: 'c0a8012e-7f8d-4b3b-9c88-1234567890ab',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    const deleteUser = this.usersService.deleteOne(id);
    return deleteUser;
  }

  @Post('/address')
  @UseGuards(authGuard.JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a shipping address ',
    description:
      'Accessible to any authenticated user (typically CUSTOMER). Adds a new shipping address for the logged-in user.',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ status: 201, description: 'Address created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my addresses ',
    description:
      'Accessible to any authenticated user (typically CUSTOMER). Returns all saved addresses of the logged-in user.',
  })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  address(@CurrentUser() user: authGuard.JwtPayload) {
    const address = this.usersService.address(user.sub);
    return address;
  }

  @Patch('/address/update/:addressId')
  @UseGuards(authGuard.JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a shipping address ',
    description:
      'Accessible to any authenticated user (typically CUSTOMER). Updates an address belonging to the logged-in user.',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '4b2c9d1e-1f44-42db-9ecb-1234567890cd',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a shipping address ',
    description:
      'Accessible to any authenticated user (typically CUSTOMER). Deletes an address belonging to the logged-in user.',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '4b2c9d1e-1f44-42db-9ecb-1234567890cd',
  })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteAddress(
    @CurrentUser() user: authGuard.JwtPayload,
    @Param('addressId') addressId: string,
  ) {
    const userId = user.sub;
    const address = this.usersService.deleteAddress(userId, addressId);
    return address;
  }
}
