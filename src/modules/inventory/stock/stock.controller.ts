import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role, StockMovementType } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkAdjustStockDto } from './dto/bulk-adjust-stock.dto';
import { StockService } from './stock.service';

@ApiTags('Inventory — Stock')
@ApiBearerAuth()
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('inventory/stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get()
  @ApiOperation({
    summary: 'Stock overview — all products with current stock [ADMIN]',
    description: 'Paginated product list with variant stocks, low-stock flag, and movement count.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by product name or SKU' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'lowStockThreshold', required: false, description: 'Filter to only products at or below this stock level' })
  getOverview(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('lowStockThreshold') lowStockThreshold?: string,
  ) {
    return this.service.getStockOverview({
      page: +page,
      limit: +limit,
      search,
      categoryId,
      brandId,
      lowStockThreshold: lowStockThreshold ? +lowStockThreshold : undefined,
    });
  }

  @Post('adjust')
  @ApiOperation({
    summary: 'Manually adjust stock for one product or variant [ADMIN]',
    description:
      'Creates a StockMovement and updates product/variant stock atomically. ' +
      'Use negative delta to reduce stock (damage, shrinkage, etc.).',
  })
  adjust(@Body() dto: AdjustStockDto, @Req() req: any) {
    return this.service.adjustStock(dto, req.user.sub);
  }

  @Post('bulk-adjust')
  @ApiOperation({
    summary: 'Bulk stock adjustment — all or nothing [ADMIN]',
    description:
      'Applies all adjustments in a single transaction. If any item would go negative or is invalid, the entire batch is rolled back.',
  })
  bulkAdjust(@Body() dto: BulkAdjustStockDto, @Req() req: any) {
    return this.service.bulkAdjust(dto, req.user.sub);
  }

  @Get('movements')
  @ApiOperation({
    summary: 'Stock movement log — full audit trail [ADMIN]',
    description: 'Paginated list of all stock changes across the system.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: StockMovementType,
    description: 'Filter by movement type',
  })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31' })
  getMovements(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: StockMovementType,
    @Query('productId') productId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getMovements({ page: +page, limit: +limit, type, productId, from, to });
  }

  @Get('movements/product/:id')
  @ApiOperation({
    summary: 'Full stock history for a single product [ADMIN]',
    description: 'Shows every stock change for this product and all its variants.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getProductMovements(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.getProductMovements(id, { page: +page, limit: +limit });
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Products at or below the low-stock threshold [ADMIN]',
  })
  @ApiQuery({ name: 'threshold', required: false, example: 10 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getLowStock(
    @Query('threshold') threshold = '10',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.getLowStock({ threshold: +threshold, page: +page, limit: +limit });
  }

  @Get('out-of-stock')
  @ApiOperation({ summary: 'Products with zero stock [ADMIN]' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getOutOfStock(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.getOutOfStock({ page: +page, limit: +limit });
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Inventory aggregate stats [ADMIN]',
    description: 'Returns total products, total stock value, low-stock count, and out-of-stock count.',
  })
  @ApiQuery({ name: 'threshold', required: false, example: 10, description: 'Low-stock threshold' })
  getStats(@Query('threshold') threshold = '10') {
    return this.service.getInventoryStats({ threshold: +threshold });
  }
}
