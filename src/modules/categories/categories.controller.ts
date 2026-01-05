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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('/create')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    console.log(createCategoryDto);
    const category = this.categoriesService.create(createCategoryDto);
    return category;
  }

  @Get()
  findAll() {
    const categories = this.categoriesService.findAll();
    return categories;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const category = this.categoriesService.findOne(id);
    return category;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = this.categoriesService.update(id, updateCategoryDto);
    return category;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const category = this.categoriesService.remove(id);
    return category;
  }
}
