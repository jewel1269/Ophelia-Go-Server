import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FilesModule } from './modules/files/files.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandsModule } from './modules/brands/brands.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { BannerModule } from './modules/banner/banner.module';
import { ReviewModule } from './modules/review/review.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailCampaignModule } from './modules/email-campaign/email-campaign.module';

@Module({
  imports: [
    // ── Core infrastructure (order matters: logs before everything else) ──
    ActivityLogsModule,   // @Global — exports ActivityLogsService everywhere
    NotificationsModule,  // Socket.IO gateway + admin notification service

    // ── Feature modules ────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    PaymentsModule,
    FilesModule,
    AnalyticsModule,
    AiAssistantModule,
    BrandsModule,
    InventoryModule,
    CartModule,
    BannerModule,
    ReviewModule,
    DashboardModule,
    CouponModule,
    EmailCampaignModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
