import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('/create')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new product [ADMIN]',
    description:
      'ADMIN only. Creates a new product with optional variants, images and tags.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return product;
  }

  @Get('/all')
  @ApiOperation({
    summary: 'Get all products (paginated) ',
    description:
      'Public route. Returns a paginated list of all products. Supports pagination via `page` and `limit` query parameters.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: String,
    example: '1',
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    example: '10',
    description: 'Items per page (default 10)',
  })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  async allProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const products = await this.productsService.allProducts({
      page: Number(page),
      limit: Number(limit),
    });
    return products;
  }

  @Delete('/delete/:id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a product [ADMIN]',
    description: 'ADMIN only. Deletes a product by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async remove(@Param('id') id: string) {
    const product = await this.productsService.remove(id);
    return product;
  }

  @Get('/filterOptions')
  @ApiOperation({
    summary: 'Get product filter options ',
    description:
      'Public route. Returns available filter values (categories, brands, price range, etc.) used by the shop page.',
  })
  @ApiResponse({ status: 200, description: 'Filter options' })
  async filterProductsItems() {
    const filterOptions = await this.productsService.filterProductsItems();
    return filterOptions;
  }

  @Get('/details/:slug')
  @ApiOperation({
    summary: 'Get product details by slug ',
    description: 'Public route. Returns a single product by its unique slug.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Product slug',
    example: 'classic-cotton-t-shirt',
  })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOneBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findOneBySlug(slug);
    return product;
  }

  @Get('/shop')
  @ApiOperation({
    summary: 'Shop page products with filtering ',
    description:
      'Public route. Returns products for the shop page with filtering support (category, brand, price, etc.) via query parameters.',
  })
  @ApiResponse({ status: 200, description: 'Filtered products list' })
  async productsByCategory(@Query() query: any) {
    const products = await this.productsService.filterShopProducts(query);
    return products;
  }

  @Get()
  @ApiOperation({
    summary: 'List products with filtering ',
    description:
      'Public route. Returns products filtered by search, category, brand, status and stock level.',
  })
  @ApiResponse({ status: 200, description: 'Filtered product list' })
  async findAll(@Query() query: ProductQueryDto) {
    console.log('Filters received:', query);
    const products = await this.productsService.findAll(query);
    return products;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID ',
    description: 'Public route. Returns a single product by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return product;
  }

  @Patch(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a product [ADMIN]',
    description: 'ADMIN only. Updates a product by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return product;
  }
}
