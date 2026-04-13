import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    if (dto.email) {
      const exists = await this.prisma.supplier.findFirst({
        where: { email: dto.email },
      });
      if (exists) throw new ConflictException('Supplier with this email already exists');
    }
    return this.prisma.supplier.create({ data: dto });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }) {
    const { page, limit, search, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { purchaseOrders: true } },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true } },
        purchaseOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalCost: true,
            expectedDate: true,
            createdAt: true,
          },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    const openOrders = await this.prisma.purchaseOrder.count({
      where: { supplierId: id, status: { in: ['DRAFT', 'ORDERED', 'PARTIAL'] } },
    });
    if (openOrders > 0) {
      throw new ConflictException(
        `Cannot delete supplier with ${openOrders} open purchase order(s). Close or cancel them first.`,
      );
    }
    // Soft delete — just mark inactive so history is preserved
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getPurchaseOrders(
    supplierId: string,
    params: { page: number; limit: number; status?: string },
  ) {
    await this.findOne(supplierId);
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;
    const where: any = { supplierId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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
}
