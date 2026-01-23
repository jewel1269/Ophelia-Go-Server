import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { deleteCache, getCache, setCache } from 'src/services/cache.service';

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
        category: true,
        brand: true,
      },
    });
    await setCache(`product:${product.id}`, product, 600);
    await deleteCache("products:all");
    return product;
  }

  async findAll() {
    const cached = await getCache("products:all");
    if (cached) return cached;
    const products = await this.prisma.product.findMany({
      include: { variants: true, category: true, brand: true },
    });
    await setCache("products:all", products, 300);
    return products;
  }

  async findOne(id: string) {
    const cached = await getCache(`product:${id}`);
    if (cached) return cached;
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true, category: true, brand: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    await setCache(`product:${id}`, product, 600);
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
      include: { variants: true, category: true, brand: true },
    });

    // If variants updated → full replace
    if (variants) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });

      const newProduct = await this.prisma.product.update({
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
        include: { variants: true, category: true, brand: true },
      });

      await setCache(`product:${id}`, newProduct, 600);
      await deleteCache("products:all");

      return newProduct;
    }

    // Normal cache update
    await setCache(`product:${id}`, updatedProduct, 600);
    await deleteCache("products:all");

    return updatedProduct;
  }

  async remove(id: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    await deleteCache(`product:${id}`);
    await deleteCache("products:all");
    return { message: 'Product deleted successfully' };
  }

  async productsByCategory(slug: string) {
    const cached = await getCache(`cat-products:${slug}`);
    if (cached) return cached;
    const category = await this.prisma.category.findFirst({
      where: { slug },
    });
    if (!category) throw new NotFoundException("Category not found");
    const products = await this.prisma.product.findMany({
      where: { categoryId: category.id },
      include: { variants: true, brand: true },
    });
    await setCache(`cat-products:${slug}`, products, 300);
    return products;
  }

  async productsByBrand(slug: string) {
    const cached = await getCache(`brand-products:${slug}`);
    if (cached) return cached;
    const brand = await this.prisma.brand.findFirst({
      where: { slug },
    });
    if (!brand) throw new NotFoundException("Brand not found");
    const products = await this.prisma.product.findMany({
      where: { brandId: brand.id },
      include: { variants: true, category: true },
    });
    await setCache(`brand-products:${slug}`, products, 300);
    return products;
  }

  async search(keyword: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { slug: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      include: { variants: true, category: true, brand: true },
    });
  }

  async paginate(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        include: { variants: true, brand: true, category: true },
      }),
      this.prisma.product.count(),
    ]);
    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: products,
    };
  }

  async featuredProducts(limit = 10) {
  const cached = await getCache("products:featured");
  if (cached) return cached;
  const products = await this.prisma.product.findMany({
    where: { isFeatured: true },
    take: limit,
    include: { variants: true, category: true, brand: true },
    orderBy: { createdAt: "desc" },
  });
  await setCache("products:featured", products, 300);
  return products;
  }

  
  async bestSellers(limit = 10) {
  const cached = await getCache("products:bestsellers");
  if (cached) return cached;
  const products = await this.prisma.product.findMany({
    where: { orderCount: { gt: 50 } },
    take: limit,
    orderBy: { orderCount: "desc" },
    include: { variants: true, category: true, brand: true },
  });

  await setCache("products:bestsellers", products, 300);
  return products;
}

  async filterProducts(
  categorySlug?: string,
  brandSlug?: string,
  minPrice?: number,
  maxPrice?: number,
  inStockOnly = true
) {
  const where: any = {};
  if (categorySlug) {
    const category = await this.prisma.category.findFirst({ where: { slug: categorySlug } });
    if (!category) throw new NotFoundException("Category not found");
    where.categoryId = category.id;
  }
  if (brandSlug) {
    const brand = await this.prisma.brand.findFirst({ where: { slug: brandSlug } });
    if (!brand) throw new NotFoundException("Brand not found");
    where.brandId = brand.id;
  }
  if (minPrice != null || maxPrice != null) {
    where.variants = {
      some: {
        price: {
          gte: minPrice ?? 0,
          lte: maxPrice ?? 999999,
        },
      },
    };
  }
  if (inStockOnly) {
    where.variants = {
      some: {
        stock: { gt: 0 },
      },
    };
  }
  return this.prisma.product.findMany({
    where,
    include: { variants: true, category: true, brand: true },
    orderBy: { createdAt: "desc" },
  });
  }

async topRated(limit = 10) {
  const cached = await getCache("products:toprated");
  if (cached) return cached;

  const products = await this.prisma.product.findMany({
    orderBy: { rating: "desc" },
    take: limit,
    include: { variants: true, category: true, brand: true },
  });

  await setCache("products:toprated", products, 300);
  return products;
}


}
