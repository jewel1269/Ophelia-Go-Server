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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('/create')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return product;
  }

  @Get('/all')
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
  async remove(@Param('id') id: string) {
    const product = await this.productsService.remove(id);
    return product;
  }

  @Get('/filterOptions')
  async filterProductsItems() {
    const filterOptions = await this.productsService.filterProductsItems();
    return filterOptions;
  }

  @Get('/details/:slug')
  async findOneBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findOneBySlug(slug);
    return product;
  }

  @Get('/shop')
  async productsByCategory(@Query() query: any) {
    const products = await this.productsService.filterShopProducts(query);
    return products;
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    console.log('Filters received:', query);
    const products = await this.productsService.findAll(query);
    return products;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return product;
  }

  @Patch(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return product;
  }
}
