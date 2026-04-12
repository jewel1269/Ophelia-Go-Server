import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLocationDto) {
    const exists = await this.prisma.warehouseLocation.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new ConflictException(`Location code "${dto.code}" already exists`);

    // If this is the new default, unset any existing default first
    if (dto.isDefault) {
      await this.prisma.warehouseLocation.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.warehouseLocation.create({ data: dto });
  }

  async findAll() {
    return this.prisma.warehouseLocation.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { stockMovements: true } },
      },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.warehouseLocation.findUnique({
      where: { id },
      include: {
        _count: { select: { stockMovements: true } },
      },
    });
    if (!location) throw new NotFoundException('Warehouse location not found');
    return location;
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);

    if (dto.code) {
      const conflict = await this.prisma.warehouseLocation.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Location code "${dto.code}" already exists`);
    }

    if (dto.isDefault) {
      await this.prisma.warehouseLocation.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.warehouseLocation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const movementsCount = await this.prisma.stockMovement.count({
      where: { locationId: id },
    });
    if (movementsCount > 0) {
      throw new ConflictException(
        `Cannot delete location — it has ${movementsCount} stock movement record(s). Deactivate it instead.`,
      );
    }
    return this.prisma.warehouseLocation.delete({ where: { id } });
  }
}
