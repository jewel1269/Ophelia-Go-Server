// coupon.controller.ts
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
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() data: CreateCouponDto) {
    return this.couponService.create(data);
  }

  @Get()
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAll(@Query() query: any) {
    console.log(query);
    const coupons = this.couponService.findAll(query);
    return coupons;
  }

  @Get('stats')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getStats() {
    return this.couponService.getStats();
  }

  // Public - checkout page থেকে call হবে
  @Get('validate/:code')
  validateCoupon(
    @Param('code') code: string,
    @Query('userId') userId: string,
    @Query('orderAmount') orderAmount: string,
  ) {
    return this.couponService.validateCoupon(code, userId, Number(orderAmount));
  }

  @Get(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: UpdateCouponDto) {
    return this.couponService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }
}
