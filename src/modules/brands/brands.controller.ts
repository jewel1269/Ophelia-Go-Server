import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateBrandsDto } from './dto/create-brand.dto';
import { JwtAuthGuard, JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  create(@Body() createBrandDto: CreateBrandsDto) {
    return this.brandsService.create(createBrandDto);
  }

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    const result = this.brandsService.findAll();
    return result;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const result = this.brandsService.findOne(id);
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
