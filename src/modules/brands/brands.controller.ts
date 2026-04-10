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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new brand [ADMIN]',
    description: 'ADMIN only. Creates a new brand.',
  })
  @ApiBody({ type: CreateBrandsDto })
  @ApiResponse({ status: 201, description: 'Brand created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  create(@Body() createBrandDto: CreateBrandsDto) {
    const result = this.brandsService.create(createBrandDto);
    return result;
  }

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all brands [ADMIN]',
    description: 'ADMIN only. Returns all brands.',
  })
  @ApiResponse({ status: 200, description: 'Brand list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  findAll() {
    const result = this.brandsService.findAll();
    return result;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a brand by ID ',
    description: 'Public route. Returns a single brand by UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Brand UUID',
    example: 'b4c9d2f3-2345-5678-9abc-def012345678',
  })
  @ApiResponse({ status: 200, description: 'Brand found' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  findOne(@Param('id') id: string) {
    const result = this.brandsService.findOne(id);
    return result;
  }

  @Patch('/update/:id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a brand [ADMIN]',
    description: 'ADMIN only. Updates a brand by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Brand UUID',
    example: 'b4c9d2f3-2345-5678-9abc-def012345678',
  })
  @ApiBody({ type: UpdateBrandDto })
  @ApiResponse({ status: 200, description: 'Brand updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    const result = this.brandsService.update(id, updateBrandDto);
    return result;
  }

  @Delete('/delete/:id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a brand [ADMIN]',
    description: 'ADMIN only. Deletes a brand by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Brand UUID',
    example: 'b4c9d2f3-2345-5678-9abc-def012345678',
  })
  @ApiResponse({ status: 200, description: 'Brand deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  remove(@Param('id') id: string) {
    const result = this.brandsService.remove(id);
    return result;
  }
}
