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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('/create')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new category [ADMIN]',
    description: 'ADMIN only. Creates a new product category.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    console.log(createCategoryDto);
    const category = this.categoriesService.create(createCategoryDto);
    return category;
  }

  @Get()
  @ApiOperation({
    summary: 'List all categories ',
    description: 'Public route. Returns all categories.',
  })
  @ApiResponse({ status: 200, description: 'Category list' })
  findAll() {
    const categories = this.categoriesService.findAll();
    return categories;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a category by ID ',
    description: 'Public route. Returns a single category by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    const category = this.categoriesService.findOne(id);
    return category;
  }

  @Patch('/update/:id')
  @ApiOperation({
    summary: 'Update a category ',
    description:
      'Updates a category by its UUID. (Note: no guard currently applied in code.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = this.categoriesService.update(id, updateCategoryDto);
    return category;
  }

  @Delete('/delete/:id')
  @ApiOperation({
    summary: 'Delete a category ',
    description:
      'Deletes a category by its UUID. (Note: no guard currently applied in code.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  remove(@Param('id') id: string) {
    const category = this.categoriesService.remove(id);
    return category;
  }

  @Get('/products/:slug')
  @ApiOperation({
    summary: 'Get products of a category by slug ',
    description:
      'Public route. Returns category information along with its products by category slug.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Category slug',
    example: 'clothing',
  })
  @ApiResponse({ status: 200, description: 'Category with its products' })
  categoriesWithProducts(@Param('slug') slug: string) {
    const categories = this.categoriesService.categoriesWithProducts(slug);
    return categories;
  }
}
