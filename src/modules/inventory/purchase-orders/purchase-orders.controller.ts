import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Inventory — Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('inventory/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a purchase order [ADMIN]',
    description: 'Creates a PO in DRAFT status. Use PATCH /:id to mark as ORDERED once sent to supplier.',
  })
  create(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all purchase orders [ADMIN]' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'supplierId', required: false })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.service.findAll({ page: +page, limit: +limit, status, supplierId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a purchase order with all items and movements [ADMIN]' })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a purchase order [ADMIN]',
    description: 'Update status (DRAFT → ORDERED), expected date, or notes. Cannot update after RECEIVED or CANCELLED.',
  })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/receive')
  @ApiOperation({
    summary: 'Receive goods against a purchase order [ADMIN]',
    description:
      'Records received quantities, increments product/variant stock, and creates StockMovement records. ' +
      'PO becomes PARTIAL if not all items received, RECEIVED when all items are done.',
  })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @Req() req: any,
  ) {
    return this.service.receive(id, dto, req.user.sub);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a purchase order [ADMIN]',
    description: 'Allowed for DRAFT, ORDERED, or PARTIAL status. Cannot cancel a fully RECEIVED PO.',
  })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a purchase order [ADMIN]',
    description: 'Only DRAFT purchase orders can be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Purchase Order UUID' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
