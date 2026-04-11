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
import { DashboardService } from './dashboard.service';
import {
  LimitQueryDto,
  LowStockQueryDto,
  RangeLimitQueryDto,
  RangeQueryDto,
} from './dto/dashboard-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

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

  @Get('sales/by-status')
  @ApiOperation({
    summary: 'Order count and revenue grouped by status [ADMIN, SUPER_ADMIN]',
  })
  salesByStatus(@Query() q: RangeQueryDto) {
    return this.dashboard.salesByStatus(q.range!);
  }

  @Get('sales/by-payment-method')
  @ApiOperation({
    summary: 'Paid transactions grouped by payment method [ADMIN, SUPER_ADMIN]',
    description:
      'Only counts payments with status=PAID. Useful for seeing which gateway drives revenue.',
  })
  salesByPaymentMethod(@Query() q: RangeQueryDto) {
    return this.dashboard.salesByPaymentMethod(q.range!);
  }

  @Get('sales/by-category')
  @ApiOperation({
    summary: 'Revenue grouped by product category [ADMIN, SUPER_ADMIN]',
  })
  salesByCategory(@Query() q: RangeQueryDto) {
    return this.dashboard.salesByCategory(q.range!);
  }

  @Get('sales/by-brand')
  @ApiOperation({
    summary: 'Revenue grouped by brand [ADMIN, SUPER_ADMIN]',
  })
  salesByBrand(@Query() q: RangeQueryDto) {
    return this.dashboard.salesByBrand(q.range!);
  }

  // -----------------------------------------------------------------
  // 3. Top lists
  // -----------------------------------------------------------------

  @Get('top/products')
  @ApiOperation({
    summary: 'Top selling products [ADMIN, SUPER_ADMIN]',
    description: 'Ranked by units sold, tie-broken by revenue.',
  })
  topProducts(@Query() q: RangeLimitQueryDto) {
    return this.dashboard.topProducts(q.range!, q.limit!);
  }

  @Get('top/customers')
  @ApiOperation({
    summary: 'Top spending customers [ADMIN, SUPER_ADMIN]',
  })
  topCustomers(@Query() q: RangeLimitQueryDto) {
    return this.dashboard.topCustomers(q.range!, q.limit!);
  }

  @Get('top/categories')
  @ApiOperation({
    summary: 'Top categories by revenue [ADMIN, SUPER_ADMIN]',
  })
  topCategories(@Query() q: RangeLimitQueryDto) {
    return this.dashboard.topCategories(q.range!, q.limit!);
  }

  @Get('top/brands')
  @ApiOperation({
    summary: 'Top brands by revenue [ADMIN, SUPER_ADMIN]',
  })
  topBrands(@Query() q: RangeLimitQueryDto) {
    return this.dashboard.topBrands(q.range!, q.limit!);
  }

  // -----------------------------------------------------------------
  // 4. Inventory health
  // -----------------------------------------------------------------

  @Get('inventory/low-stock')
  @ApiOperation({
    summary: 'Products with stock at or below a threshold [ADMIN, SUPER_ADMIN]',
  })
  lowStock(@Query() q: LowStockQueryDto) {
    return this.dashboard.lowStockProducts(q.threshold!);
  }

  @Get('inventory/out-of-stock')
  @ApiOperation({
    summary: 'Products and variants with stock = 0 [ADMIN, SUPER_ADMIN]',
  })
  outOfStock() {
    return this.dashboard.outOfStockProducts();
  }

  @Get('inventory/stock-value')
  @ApiOperation({
    summary: 'Capital locked in inventory [ADMIN, SUPER_ADMIN]',
    description: 'SUM(stock * price) across non-archived products.',
  })
  stockValue() {
    return this.dashboard.stockValue();
  }

  @Get('inventory/never-sold')
  @ApiOperation({
    summary:
      'Products with zero orders and older than 30 days [ADMIN, SUPER_ADMIN]',
    description: 'Dead-stock candidates.',
  })
  neverSold() {
    return this.dashboard.neverSoldProducts();
  }

  // -----------------------------------------------------------------
  // 5. Customer insights
  // -----------------------------------------------------------------

  @Get('customers/new')
  @ApiOperation({
    summary: 'Daily new customer signups time series [ADMIN, SUPER_ADMIN]',
  })
  newCustomers(@Query() q: RangeQueryDto) {
    return this.dashboard.newCustomersTimeSeries(q.range!);
  }

  @Get('customers/returning-vs-new')
  @ApiOperation({
    summary:
      'Split of customers by first-time vs repeat in range [ADMIN, SUPER_ADMIN]',
    description:
      'New = exactly one order in the range. Returning = more than one order in the range.',
  })
  returningVsNew(@Query() q: RangeQueryDto) {
    return this.dashboard.returningVsNew(q.range!);
  }

  @Get('customers/locations')
  @ApiOperation({
    summary:
      'Customer saved address count grouped by city [ADMIN, SUPER_ADMIN]',
  })
  customerLocations(@Query() q: LimitQueryDto) {
    return this.dashboard.customerLocations(q.limit!);
  }

  // -----------------------------------------------------------------
  // 6. Orders operations
  // -----------------------------------------------------------------

  @Get('orders/recent')
  @ApiOperation({
    summary: 'Most recent orders [ADMIN, SUPER_ADMIN]',
  })
  recentOrders(@Query() q: LimitQueryDto) {
    return this.dashboard.recentOrders(q.limit!);
  }

  @Get('orders/pending-actions')
  @ApiOperation({
    summary: 'Orders stuck in PENDING/PROCESSING >24h [ADMIN, SUPER_ADMIN]',
    description: 'SLA breach bucket for operations.',
  })
  pendingActions() {
    return this.dashboard.pendingActionsOrders();
  }

  @Get('orders/returns-rate')
  @ApiOperation({
    summary: 'Cancellation and return rate [ADMIN, SUPER_ADMIN]',
  })
  returnsRate(@Query() q: RangeQueryDto) {
    return this.dashboard.returnsRate(q.range!);
  }

  @Get('orders/fulfillment-time')
  @ApiOperation({
    summary: 'Average order fulfillment time [ADMIN, SUPER_ADMIN]',
    description:
      'Approximated via updatedAt - createdAt for orders that reached SHIPPED/DELIVERED.',
  })
  fulfillmentTime(@Query() q: RangeQueryDto) {
    return this.dashboard.fulfillmentTime(q.range!);
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

  @Get('reviews/pending')
  @ApiOperation({
    summary: 'Reviews awaiting moderation [ADMIN, SUPER_ADMIN]',
  })
  pendingReviews(@Query() q: LimitQueryDto) {
    return this.dashboard.pendingReviews(q.limit!);
  }

  @Get('reviews/summary')
  @ApiOperation({
    summary:
      'Total, average rating and rating distribution [ADMIN, SUPER_ADMIN]',
  })
  reviewsSummary() {
    return this.dashboard.reviewsSummary();
  }

  @Get('reviews/low-rated-products')
  @ApiOperation({
    summary: 'Products with average rating below 3 [ADMIN, SUPER_ADMIN]',
    description:
      'Requires a minimum review count to avoid flagging products with only one bad review.',
  })
  lowRated() {
    return this.dashboard.lowRatedProducts();
  }

  // -----------------------------------------------------------------
  // 9. Support / tickets
  // -----------------------------------------------------------------

  @Get('tickets/summary')
  @ApiOperation({
    summary:
      'Ticket counts grouped by status and priority [ADMIN, SUPER_ADMIN]',
  })
  ticketsSummary() {
    return this.dashboard.ticketsSummary();
  }

  @Get('tickets/open-by-priority')
  @ApiOperation({
    summary: 'Open tickets sorted by priority [ADMIN, SUPER_ADMIN]',
  })
  openTicketsByPriority() {
    return this.dashboard.openTicketsByPriority();
  }

  @Get('tickets/response-time')
  @ApiOperation({
    summary: 'Average first-admin-reply response time [ADMIN, SUPER_ADMIN]',
    description:
      'Excludes tickets where no admin has replied yet. Returned in minutes.',
  })
  ticketResponseTime() {
    return this.dashboard.ticketResponseTime();
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
