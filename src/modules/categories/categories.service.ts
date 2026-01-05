import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });
    return category;
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    });
    return categories;
  }

  async findOne(id: string) {
    if (!id) throw new NotFoundException('Category not found');
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    if (!id) throw new NotFoundException('Category not found');
    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
    return category;
  }

  async remove(id: string) {
    if (!id) throw new NotFoundException('Category not found');
    const result = await this.prisma.category.delete({ where: { id } });
    return result;
  }
}
