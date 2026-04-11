import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an auth record ',
    description:
      'Placeholder endpoint. Auth flows (register/login/logout) are implemented in the Users module.',
  })
  @ApiResponse({ status: 201, description: 'Auth record created' })
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List auth records ',
    description: 'Placeholder endpoint that lists auth records.',
  })
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single auth record ',
    description: 'Placeholder endpoint that returns a single auth record.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Auth record numeric id' })
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an auth record ',
    description: 'Placeholder endpoint that updates an auth record.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Auth record numeric id' })
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an auth record ',
    description: 'Placeholder endpoint that deletes an auth record.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Auth record numeric id' })
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
