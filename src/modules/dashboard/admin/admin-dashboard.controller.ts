import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  CustomerQueryDto,
  InventoryQueryDto,
  LimitQueryDto,
  OrderInsightQueryDto,
  RangeQueryDto,
  ReviewQueryDto,
  SalesQueryDto,
  TicketQueryDto,
  TopQueryDto,
} from './dto/admin-dashboard-query.dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('dashboard/admin')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  // -----------------------------------------------------------------
  // 1. Overview
  // -----------------------------------------------------------------

  @Get('overview')
  @ApiOperation({
    summary: 'Dashboard KPI overview [ADMIN, SUPER_ADMIN]',
    description:
      'One-shot endpoint that powers the admin dashboard header cards: revenue (today / 7d / 30d / all), orders, customers, inventory alerts and action-required counters.',
  })
  @ApiResponse({ status: 200, description: 'Aggregated KPI snapshot' })
  overview() {
    return this.dashboard.overview();
  }

  // -----------------------------------------------------------------
  // 2. Revenue / sales charts
  // -----------------------------------------------------------------

  @Get('revenue')
  @ApiOperation({
    summary: 'Daily revenue time series [ADMIN, SUPER_ADMIN]',
    description:
      'Returns daily revenue + order counts for charting. Excludes CANCELLED and RETURNED orders.',
  })
  @ApiResponse({ status: 200, description: 'Daily buckets of revenue/orders' })
  revenue(@Query() q: RangeQueryDto) {
    return this.dashboard.revenueTimeSeries(q.range!);
  }

  @Get('sales')
  @ApiOperation({
    summary: 'Sales breakdown [ADMIN, SUPER_ADMIN]',
    description:
      'Use the type param to choose the grouping dimension:\n\n' +
      '- status — order count & revenue per order status\n' +
      '- payment-method — transactions & revenue per gateway (PAID only)\n' +
      '- category — revenue & units per product category\n' +
      '- brand — revenue & units per brand\n' +
      '- day-of-week — orders & revenue per weekday (Sun–Sat)\n' +
      '- aov-trend — daily average order value time series\n' +
      '- repeat-rate — repeat purchase rate summary + weekly trend\n' +
      '- all (default) — returns all groups in one response',
  })
  sales(@Query() q: SalesQueryDto) {
    return this.dashboard.salesByType(q.range!, q.type!);
  }

  // -----------------------------------------------------------------
  // 3. Top lists
  // -----------------------------------------------------------------

  @Get('top')
  @ApiOperation({
    summary: 'Top N ranking [ADMIN, SUPER_ADMIN]',
    description:
      'Use type to choose what to rank and range to filter by date:\n\n' +
      '- products (default) — top selling products by units sold\n' +
      '- customers — top spending customers by total amount\n' +
      '- categories — top categories by revenue\n' +
      '- brands — top brands by revenue\n\n' +
      'Use limit to control how many rows are returned (default 10, max 100).',
  })
  top(@Query() q: TopQueryDto) {
    return this.dashboard.topByType(q.type!, q.limit!, q.from, q.to);
  }

  // -----------------------------------------------------------------
  // 4. Inventory health
  // -----------------------------------------------------------------

  @Get('inventory')
  @ApiOperation({
    summary: 'Inventory health [ADMIN, SUPER_ADMIN]',
    description:
      'Use type to choose the report:\n\n' +
      '- low-stock — products at or below the threshold param\n' +
      '- out-of-stock — products/variants with stock = 0\n' +
      '- stock-value — capital locked in inventory\n' +
      '- never-sold — products with zero orders older than staleDays days\n' +
      '- all (default) — returns all four groups',
  })
  inventory(@Query() q: InventoryQueryDto) {
    return this.dashboard.inventoryByType(q.type!, q.threshold!, q.staleDays!, q.from, q.to);
  }

  // -----------------------------------------------------------------
  // 5. Customer insights
  // -----------------------------------------------------------------

  @Get('customers')
  @ApiOperation({
    summary: 'Customer insights [ADMIN, SUPER_ADMIN]',
    description:
      'Use type to choose the report:\n\n' +
      '- new-signups — daily new customer time series\n' +
      '- returning-vs-new — first-time vs repeat split\n' +
      '- locations — address count grouped by city\n' +
      '- all (default) — returns all three groups',
  })
  customers(@Query() q: CustomerQueryDto) {
    return this.dashboard.customersByType(q.type!, q.limit!, q.from, q.to);
  }

  // -----------------------------------------------------------------
  // 6. Orders operations
  // -----------------------------------------------------------------

  @Get('orders')
  @ApiOperation({
    summary: 'Order insights [ADMIN, SUPER_ADMIN]',
    description:
      'Use type to choose the report:\n\n' +
      '- recent — most recent orders\n' +
      '- pending-actions — orders stuck in PENDING/PROCESSING >24h\n' +
      '- returns-rate — cancellation and return rate\n' +
      '- fulfillment-time — average order fulfillment time\n' +
      '- all (default) — returns all four groups',
  })
  orders(@Query() q: OrderInsightQueryDto) {
    return this.dashboard.orderInsightsByType(q.type!, q.limit!, q.from, q.to);
  }

  // -----------------------------------------------------------------
  // 7. Marketing / promotions
  // -----------------------------------------------------------------

  @Get('coupons/usage')
  @ApiOperation({
    summary:
      'Per-coupon usage, discount given and remaining capacity [ADMIN, SUPER_ADMIN]',
  })
  couponUsage() {
    return this.dashboard.couponUsage();
  }

  @Get('flash-sales/performance')
  @ApiOperation({
    summary: 'Units sold and revenue per flash sale [ADMIN, SUPER_ADMIN]',
  })
  flashSales() {
    return this.dashboard.flashSalePerformance();
  }

  @Get('banners/active')
  @ApiOperation({
    summary:
      'Currently active banners ordered by position [ADMIN, SUPER_ADMIN]',
  })
  activeBanners() {
    return this.dashboard.activeBanners();
  }

  // -----------------------------------------------------------------
  // 8. Reviews / quality
  // -----------------------------------------------------------------

  @Get('reviews')
  @ApiOperation({
    summary: 'Review insights [ADMIN, SUPER_ADMIN]',
    description:
      'Use type to choose the report:\n\n' +
      '- pending — reviews awaiting moderation\n' +
      '- summary — total, average rating and distribution\n' +
      '- low-rated — products with average rating below 3\n' +
      '- all (default) — returns all three groups',
  })
  reviews(@Query() q: ReviewQueryDto) {
    return this.dashboard.reviewsByType(q.type!, q.limit!, q.minReviewCount!, q.from, q.to);
  }

  // -----------------------------------------------------------------
  // 9. Support / tickets
  // -----------------------------------------------------------------

  @Get('tickets')
  @ApiOperation({
    summary: 'Ticket insights [ADMIN, SUPER_ADMIN]',
    description:
      'Use type to choose the report:\n\n' +
      '- summary — ticket counts by status and priority\n' +
      '- open-by-priority — open tickets sorted by priority\n' +
      '- response-time — average first-admin-reply time\n' +
      '- all (default) — returns all three groups',
  })
  tickets(@Query() q: TicketQueryDto) {
    return this.dashboard.ticketsByType(q.type!, q.from, q.to);
  }

  // -----------------------------------------------------------------
  // 10. Activity feed
  // -----------------------------------------------------------------

  @Get('activity')
  @ApiOperation({
    summary: 'Recent activity log entries [ADMIN, SUPER_ADMIN]',
  })
  activity(@Query() q: LimitQueryDto) {
    return this.dashboard.activityFeed(q.limit!);
  }
}
