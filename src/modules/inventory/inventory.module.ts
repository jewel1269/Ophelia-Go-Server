import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';


import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';

import { LocationsController } from './locations/locations.controller';
import { LocationsService } from './locations/locations.service';

import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';

import { StockController } from './stock/stock.controller';
import { StockService } from './stock/stock.service';

@Module({
  imports: [AuthModule],
  controllers: [
    SuppliersController,
    LocationsController,
    PurchaseOrdersController,
    StockController,
  ],
  providers: [
    SuppliersService,
    LocationsService,
    PurchaseOrdersService,
    StockService,
    JwtRefreshGuard,
    RolesGuard,
  ],
})
export class InventoryModule {}
