import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { BuyNowDto } from './dto/buy-now-dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an order from the cart [CUSTOMER]',
    description:
      'Authenticated customers only. Converts the logged-in user cart into an order. Supports COD & ONLINE payment.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    const order = this.ordersService.createOrderFromCart(user.sub, dto);
    return order;
  }

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all orders [ADMIN, SUPER_ADMIN]',
    description:
      'ADMIN / SUPER_ADMIN only. Returns a paginated list of all orders with stats. Supports searching by order number, filtering by `status` and `paymentStatus`, and pagination.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Items per page (default 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'ORD-2024-001',
    description: 'Search term (matches against order number)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'PENDING',
    description:
      'Filter by order status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED)',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    example: 'PAID',
    description: 'Filter by payment status (PENDING, PAID, FAILED, REFUNDED)',
  })
  @ApiResponse({ status: 200, description: 'Paginated orders list with stats' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async allOrders(@Query() queryParams: any) {
    const orders = await this.ordersService.getAllOrders(queryParams);
    return orders;
  }

  @Post('buy-now')
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buy now (single product checkout) [CUSTOMER]',
    description:
      'Authenticated customers only. Creates an order for a single product directly, bypassing the cart.',
  })
  @ApiBody({ type: BuyNowDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  buyNow(@CurrentUser() user: any, @Body() dto: BuyNowDto) {
    return this.ordersService.buyNow(user.sub, dto);
  }

  @Get('my-orders')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my orders [CUSTOMER]',
    description:
      'CUSTOMER only. Returns all orders belonging to the logged-in customer. Supports filtering by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'DELIVERED',
    description:
      'Filter by order status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED)',
  })
  @ApiResponse({ status: 200, description: 'Customer orders list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async myOrder(@CurrentUser() user: any, @Query('status') status?: string) {
    console.log('hitted');
    const userId = user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    const userOrders = await this.ordersService.find(userId, status);
    return userOrders;
  }

  @Get('track/:orderNumber')
  @ApiOperation({
    summary: 'Track order by order number ',
    description:
      'Public route. Returns order tracking details for the given order number.',
  })
  @ApiParam({
    name: 'orderNumber',
    description: 'Unique order number',
    example: 'ORD-20240101-0001',
  })
  @ApiResponse({ status: 200, description: 'Order tracking details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findOneByOrderId(orderNumber);
    return order;
  }

  @Get('details/:id')
  @ApiOperation({
    summary: 'Get order details by ID ',
    description:
      'Returns full order details (items, user, address, payment) by order UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'e6f7a8b9-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id') id: string) {
    return await this.ordersService.getOrderById(id);
  }

  @Put('update-status/:id')
  @ApiOperation({
    summary: 'Update order status [ADMIN]',
    description:
      'Updates the status of an order by its UUID. Typically used by ADMIN / SUPER_ADMIN to mark orders as PROCESSING, SHIPPED, DELIVERED, etc.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'e6f7a8b9-1234-4567-89ab-cdef01234567',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'SHIPPED',
          description:
            'New order status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(@Param('id') id: string, @Body() dto: any) {
    const update = await this.ordersService.updateOrderStatus(id, dto);
    return update;
  }
}
