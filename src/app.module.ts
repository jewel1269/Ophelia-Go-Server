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

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
