import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { StockMovementType } from '@prisma/client';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async generatePoNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.purchaseOrder.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `PO-${dateStr}-${seq}`;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(dto: CreatePurchaseOrderDto, adminId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.isActive)
      throw new BadRequestException('Cannot create PO for an inactive supplier');

    const totalCost = dto.items.reduce(
      (sum, i) => sum + i.orderedQty * i.costPrice,
      0,
    );

    const poNumber = await this.generatePoNumber();

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        totalCost,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            orderedQty: i.orderedQty,
            costPrice: i.costPrice,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    supplierId?: string;
  }) {
    const { page, limit, status, supplierId } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, stock: true, thumbnail: true } },
            variant: { select: { id: true, name: true, sku: true, stock: true } },
          },
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.findOne(id);
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot update a purchase order with status ${po.status}`,
      );
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: dto });
  }

  // ---------------------------------------------------------------------------
  // Receive goods — the key operation
  // ---------------------------------------------------------------------------

  async receive(id: string, dto: ReceivePurchaseOrderDto, adminId: string) {
    const po = await this.findOne(id);

    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Cannot receive a cancelled purchase order');
    }
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('This purchase order is already fully received');
    }

    // Build a map of existing items for fast lookup
    const itemMap = new Map(po.items.map((i) => [i.id, i]));

    // Validate all incoming items first
    for (const incoming of dto.items) {
      const poItem = itemMap.get(incoming.purchaseOrderItemId);
      if (!poItem) {
        throw new NotFoundException(
          `Purchase order item ${incoming.purchaseOrderItemId} not found in this PO`,
        );
      }
      const remaining = poItem.orderedQty - poItem.receivedQty;
      if (incoming.receivedQty > remaining) {
        throw new BadRequestException(
          `Item ${poItem.product.name} (${poItem.variant?.sku ?? poItem.product.sku}): ` +
            `trying to receive ${incoming.receivedQty} but only ${remaining} remaining`,
        );
      }
    }

    // Process each received item inside a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const incoming of dto.items) {
        const poItem = itemMap.get(incoming.purchaseOrderItemId)!;

        // Update received qty on the PO item
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: { increment: incoming.receivedQty } },
        });

        // Get current stock and update
        if (poItem.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: poItem.variantId },
            select: { stock: true },
          });
          const stockBefore = variant!.stock;
          const stockAfter = stockBefore + incoming.receivedQty;

          await tx.productVariant.update({
            where: { id: poItem.variantId },
            data: { stock: { increment: incoming.receivedQty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: poItem.productId,
              variantId: poItem.variantId,
              type: StockMovementType.PURCHASE,
              delta: incoming.receivedQty,
              stockBefore,
              stockAfter,
              reason: `Received from PO ${po.poNumber}`,
              note: dto.notes,
              reference: po.poNumber,
              locationId: dto.locationId,
              purchaseOrderId: po.id,
              performedById: adminId,
            },
          });
        } else {
          const product = await tx.product.findUnique({
            where: { id: poItem.productId },
            select: { stock: true },
          });
          const stockBefore = product!.stock;
          const stockAfter = stockBefore + incoming.receivedQty;

          await tx.product.update({
            where: { id: poItem.productId },
            data: { stock: { increment: incoming.receivedQty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: poItem.productId,
              type: StockMovementType.PURCHASE,
              delta: incoming.receivedQty,
              stockBefore,
              stockAfter,
              reason: `Received from PO ${po.poNumber}`,
              note: dto.notes,
              reference: po.poNumber,
              locationId: dto.locationId,
              purchaseOrderId: po.id,
              performedById: adminId,
            },
          });
        }
      }

      // Determine new PO status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      const allReceived = updatedItems.every(
        (i) => i.receivedQty >= i.orderedQty,
      );

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: allReceived ? 'RECEIVED' : 'PARTIAL',
          receivedDate: allReceived
            ? dto.receivedDate
              ? new Date(dto.receivedDate)
              : new Date()
            : undefined,
        },
      });
    });

    return this.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  async cancel(id: string) {
    const po = await this.findOne(id);
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('Cannot cancel a fully received purchase order');
    }
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Purchase order is already cancelled');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ---------------------------------------------------------------------------
  // Delete (draft only)
  // ---------------------------------------------------------------------------

  async remove(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only DRAFT purchase orders can be deleted. Cancel it first if it was already sent to supplier.',
      );
    }
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
