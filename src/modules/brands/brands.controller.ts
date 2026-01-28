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
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createBrandDto: CreateBrandsDto) {
    const result = this.brandsService.create(createBrandDto);
    return result;
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

  @Patch('/update/:id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    const result = this.brandsService.update(id, updateBrandDto);
    return result;
  }

  @Delete('/delete/:id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    const result = this.brandsService.remove(id);
    return result;
  }
}
