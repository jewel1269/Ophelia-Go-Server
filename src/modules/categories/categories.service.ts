import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { deleteCache, getCache, setCache } from 'src/services/cache.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });
    await setCache(`category:${category.id}`, category, 300);
    await deleteCache('categories');
    return category;
  }

  async findAll() {
    const cached = await getCache('categories');
    if (cached) return cached;

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

    await setCache('categories', categories, 300);
    return categories;
  }

  async findOne(id: string) {
    if (!id) throw new NotFoundException('Category not found');

    const cached = await getCache(`category:${id}`);
    if (cached) return cached;

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) throw new NotFoundException('Category not found');

    await setCache(`category:${id}`, category, 300);
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    if (!id) throw new NotFoundException('Category not found');

    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    await deleteCache(`category:${id}`);
    await deleteCache('categories');

    return category;
  }

  async remove(id: string) {
    if (!id) throw new NotFoundException('Category not found');

    const result = await this.prisma.category.delete({
      where: { id },
    });

    await deleteCache(`category:${id}`);
    await deleteCache('categories');

    return result;
  }

  async categoriesWithProducts(slug: string) {
    if (!slug) throw new NotFoundException('Slug is missing');
    const cached = await getCache(`cat-products:${slug}`);
    if (cached) return cached;
    const category = await this.prisma.category.findFirst({
      where: { slug },
      include: {
        children: {
          include: {
            children: true,
            products: true,
          },
        },
        products: true,
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    await setCache(`cat-products:${slug}`, category, 300);
    return category;
  }

  async getCategoryTree() {
    const cached = await getCache('category-tree');
    if (cached) return cached;
    const tree = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    });

    await setCache('category-tree', tree, 600);
    return tree;
  }

  async getProductsByCategory(slug: string, page = 1, limit = 20) {
    const category = await this.prisma.category.findFirst({
      where: { slug },
    });
    if (!category) throw new NotFoundException('Category not found');
    const skip = (page - 1) * limit;
    const products = await this.prisma.product.findMany({
      where: { categoryId: category.id },
      skip,
      take: limit,
    });
    const total = await this.prisma.product.count({
      where: { categoryId: category.id },
    });
    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: products,
    };
  }

  async getCategoryStats() {
    const categories = await this.prisma.category.count();
    const subCategories = await this.prisma.category.count({
      where: { parentId: { not: null } },
    });
    const products = await this.prisma.product.count();
    return {
      totalCategories: categories,
      totalSubCategories: subCategories,
      totalProducts: products,
    };
  }

  async searchCategory(keyword: string) {
    return await this.prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { slug: { contains: keyword, mode: 'insensitive' } },
        ],
      },
    });
  }
}
