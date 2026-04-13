import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Inventory — Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('inventory/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a supplier [ADMIN]' })
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all suppliers [ADMIN]' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, contact, email, phone' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll({
      page: +page,
      limit: +limit,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier with recent purchase orders [ADMIN]' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier [ADMIN]' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a supplier [ADMIN]',
    description: 'Soft-deletes (marks inactive). Blocked if supplier has open purchase orders.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/purchase-orders')
  @ApiOperation({ summary: 'List all purchase orders for a supplier [ADMIN]' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
  })
  getOrders(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.service.getPurchaseOrders(id, { page: +page, limit: +limit, status });
  }
}
