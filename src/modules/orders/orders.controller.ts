import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { BuyNowDto } from './dto/buy-now-dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtRefreshGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    const order = this.ordersService.createOrderFromCart(user.sub, dto);
    return order;
  }

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async allOrders(@Query() queryParams: any) {
    const orders = await this.ordersService.getAllOrders(queryParams);
    return orders;
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return await this.ordersService.getOrderById(id);
  }

  @Post('buy-now')
  @UseGuards(JwtRefreshGuard)
  buyNow(@CurrentUser() user: any, @Body() dto: BuyNowDto) {
    return this.ordersService.buyNow(user.sub, dto);
  }

  @Get('/my-orders')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async myOrder(@CurrentUser() user: any, @Query('status') status?: string) {
    const userId = user?.sub || user?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    return await this.ordersService.find(userId, status);
  }

  @Get('track/:orderNumber')
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findOneByOrderId(orderNumber);
    return order;
  }
}
