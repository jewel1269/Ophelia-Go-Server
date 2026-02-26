import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateProductDto, ProductAttributes } from './dto/create-product.dto';
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
    await deleteCache('products:all');
    return product;
  }

  async findAll(query?: any) {
    const hasFilters = query && Object.keys(query).length > 0 && 
                       Object.values(query).some(val => val !== undefined && val !== '');
  

    if (!hasFilters) {
      const cached = await getCache('products:all');
      if (cached) return cached;
    }
    const { search, category, brand, status, stockLevel } = query || {};
    let where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && !status.includes('All')) {
      if (status === 'Active') {
        where.isFeatured = true;
        where.isArchived = false;
      } else if (status === 'Inactive') {
        where.isArchived = true;
      }
    }

    if (category && !category.includes('All')) {
      where.category = { name: category };
    }
    if (brand && !brand.includes('All')) {
      where.brand = { name: brand };
    }
  
    if (stockLevel && !stockLevel.includes('All')) {
      if (stockLevel === 'Low Stock') where.stock = { lte: 10, gt: 0 };
      if (stockLevel === 'Empty' || stockLevel === 'Out of Stock') where.stock = 0;
      if (stockLevel === 'In Stock') where.stock = { gt: 10 };
    }
  
    const [products, totalCount, activeCount, lowStockCount, outOfStockCount] = await Promise.all([
      this.prisma.product.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          variants: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count(), 
      this.prisma.product.count({ where: { isFeatured: true, isArchived: false } }), 
      this.prisma.product.count({ where: { stock: { lte: 10, gt: 0 } } }), 
      this.prisma.product.count({ where: { stock: 0 } }), 
    ]);
  
    const result = {
      products,
      stats: {
        total: totalCount,
        active: activeCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
    };

    if (!hasFilters) {
      await setCache('products:all', result, 300);
    }
  
    return result;
  }

  async allProducts({
    page,
    limit,
    category,
  }: {
    page: number;
    limit: number;
    category?: string;
  }) {
    const skip = (page - 1) * limit;
    const cacheKey = `products:all:${category || 'none'}:${page}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;
    const whereFilter: any = {};
    if (category && category !== 'For You') {
      whereFilter.category = { name: category };
    }
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: whereFilter,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          rating: true,
          averageRating: true,
          discountPrice: true,
          thumbnail: true,
          images: true,
          variants: {
            select: {
              id: true,
              sku: true,
              price: true,
              stock: true,
              attributes: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where: whereFilter }),
    ]);
    const formattedProducts = products.map((product) => {
      const discount = product.discountPrice
        ? Math.round(
            ((product.price - product.discountPrice) / product.price) * 100,
          )
        : 0;
      return {
        ...product,
        discountPercentage: discount,
      };
    });
    const data = formattedProducts;
    const meta = {
      total,
      lastPage: Math.ceil(total / limit),
      currentPage: page,
      hasMore: skip + products.length < total,
    };
    const response = {
      data,
      meta,
    };
    await setCache(cacheKey, response, 200);

    return response;
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

  async findOneBySlug(slug: string) {
    const cached = await getCache(`product:${slug}`);
    if (cached) return cached;
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true, category: true, brand: true, reviews: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    await setCache(`product:${slug}`, product, 600);
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
      await deleteCache('products:all');

      return newProduct;
    }

    // Normal cache update
    await setCache(`product:${id}`, updatedProduct, 600);
    await deleteCache('products:all');

    return updatedProduct;
  }

  async remove(id: string) {
    if (!id) throw new NotFoundException('Product not found');
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        reviews: true,
        orderItems: true,
        cartItems: true,
        wishlistItems: true,
        flashSaleItems: true,
      },
    });

    if (!existingProduct) throw new NotFoundException('Product not found');
    if (existingProduct.orderItems.length > 0) {
      throw new BadRequestException(
        `Cannot delete product. ${existingProduct.orderItems.length} order(s) exist for this product.`,
      );
    }
    if (existingProduct.reviews.length > 0) {
      await this.prisma.review.updateMany({
        where: { productId: id },
        data: { isArchived: true },
      });
    }
    await this.prisma.product.delete({
      where: { id },
    });
    await deleteCache(`product:${id}`);
    await deleteCache('products:all');

    return { message: 'Product deleted successfully' };
  }

  async filterShopProducts(query: any) {
    const {
      search,
      categories,
      brands,
      sizes,
      colors,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20,
    } = query;

    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (currentPage - 1) * take;

    const where: any = { isArchived: false };

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const toCleanArray = (val: any): string[] => {
      if (!val || val === 'on') return [];
      const arr = Array.isArray(val) ? val : [val];
      return [...new Set(arr.map((v) => v?.trim()).filter(Boolean))];
    };

    const catArr = toCleanArray(categories);
    const brandArr = toCleanArray(brands);
    const sizeArr = toCleanArray(sizes);
    const colorArr = toCleanArray(colors);
    if (catArr.length > 0) {
      where.category = { slug: { in: catArr } };
    }

    if (brandArr.length > 0) {
      where.brand = { slug: { in: brandArr } };
    }

    const min = minPrice !== undefined ? Number(minPrice) : undefined;
    const max = maxPrice !== undefined ? Number(maxPrice) : undefined;

    if (min !== undefined || max !== undefined) {
      where.price = {};
      if (min !== undefined && !isNaN(min)) where.price.gte = Math.max(0, min);
      if (max !== undefined && !isNaN(max)) where.price.lte = Math.max(0, max);
    }

    if (sizeArr.length > 0 || colorArr.length > 0) {
      const variantConditions: any[] = [];

      if (sizeArr.length > 0) {
        variantConditions.push({
          OR: sizeArr.map((size) => ({
            attributes: { path: ['size'], string_contains: size },
          })),
        });
      }

      if (colorArr.length > 0) {
        variantConditions.push({
          OR: colorArr.map((color) => ({
            attributes: { path: ['color'], string_contains: color },
          })),
        });
      }

      where.variants = {
        some:
          variantConditions.length > 1
            ? { AND: variantConditions }
            : variantConditions[0],
      };
    }

    const sortOptions: Record<string, any> = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      rating: { averageRating: 'desc' },
      newest: { createdAt: 'desc' },
      recommended: { averageRating: 'desc' },
    };

    const orderBy = sortOptions[sort] || { createdAt: 'desc' };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          thumbnail: true,
          images: true,
          rating: true,
          averageRating: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const formattedData = products.map((product) => {
      const price = product.price || 0;
      const discountPrice = product.discountPrice || 0;
      const discountPercentage =
        discountPrice > 0 && price > 0
          ? Math.round(((price - discountPrice) / price) * 100)
          : 0;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price,
        discountPrice,
        discountPercentage,
        thumbnail: product.thumbnail,
        images: product.images,
        rating: product.rating || 0,
        averageRating: product.averageRating || 0,
      };
    });

    const lastPage = Math.ceil(total / take);

    return {
      data: formattedData,
      meta: {
        total,
        lastPage,
        currentPage,
        perPage: take,
        hasMore: currentPage < lastPage,
      },
    };
  }

  async productsByCategory(slug: string) {
    const cached = await getCache(`cat-products:${slug}`);
    if (cached) return cached;
    const category = await this.prisma.category.findFirst({
      where: { slug },
    });
    if (!category) throw new NotFoundException('Category not found');
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
    if (!brand) throw new NotFoundException('Brand not found');
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
    const cached = await getCache('products:featured');
    if (cached) return cached;
    const products = await this.prisma.product.findMany({
      where: { isFeatured: true },
      take: limit,
      include: { variants: true, category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });
    await setCache('products:featured', products, 300);
    return products;
  }

  async bestSellers(limit = 10) {
    const cached = await getCache('products:bestsellers');
    if (cached) return cached;
    const products = await this.prisma.product.findMany({
      where: { orderCount: { gt: 50 } },
      take: limit,
      orderBy: { orderCount: 'desc' },
      include: { variants: true, category: true, brand: true },
    });

    await setCache('products:bestsellers', products, 300);
    return products;
  }

  async filterProducts(
    categorySlug?: string,
    brandSlug?: string,
    minPrice?: number,
    maxPrice?: number,
    inStockOnly = true,
  ) {
    const where: any = {};
    if (categorySlug) {
      const category = await this.prisma.category.findFirst({
        where: { slug: categorySlug },
      });
      if (!category) throw new NotFoundException('Category not found');
      where.categoryId = category.id;
    }
    if (brandSlug) {
      const brand = await this.prisma.brand.findFirst({
        where: { slug: brandSlug },
      });
      if (!brand) throw new NotFoundException('Brand not found');
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async topRated(limit = 10) {
    const cached = await getCache('products:toprated');
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      orderBy: { rating: 'desc' },
      take: limit,
      include: { variants: true, category: true, brand: true },
    });

    await setCache('products:toprated', products, 300);
    return products;
  }

  async filterProductsItems() {
    const cached = await getCache('products:filter-sidebar-items');
    if (cached) return cached;
    const [categories, brands, variants] = await Promise.all([
      this.prisma.category.findMany({
        select: { name: true, slug: true },
      }),
      this.prisma.brand.findMany({
        select: { name: true, slug: true },
      }),
      this.prisma.productVariant.findMany({
        select: { attributes: true },
      }),
    ]);
    const sizes = new Set<string>();
    const colors = new Set<string>();

    variants.forEach((variant) => {
      const attr = variant.attributes as unknown as ProductAttributes;

      if (attr) {
        if (attr.size) sizes.add(attr.size);
        if (attr.color) colors.add(attr.color);
      }
    });
    const response = {
      categories,
      brands,
      sizes: Array.from(sizes),
      colors: Array.from(colors),
    };

    await setCache('products:filter-sidebar-items', response, 300);
    return response;
  }
}
