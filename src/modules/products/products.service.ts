import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const { variants, ...productData } = createProductDto;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        variants: variants?.length
          ? {
              create: variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                price: v.price,
                stock: v.stock,
                attributes: v.attributes ?? {},
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    });

    return product;
  }

  async findAll() {
    return await this.prisma.product.findMany({
      include: { variants: true, category: true, brand: true },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true, category: true, brand: true },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) throw new NotFoundException('Product not found');

    const { variants, ...productData } = updateProductDto;

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
      },
    });

    if (variants) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });
      await this.prisma.product.update({
        where: { id },
        data: {
          variants: {
            create: variants.map((v) => ({
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              attributes: v.attributes ?? {},
            })),
          },
        },
        include: { variants: true },
      });
    }
    return updatedProduct;
  }

  async remove(id: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}
