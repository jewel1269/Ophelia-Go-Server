import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBrandsDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { deleteCache, getCache, setCache } from 'src/services/cache.service';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandsDto) {
    const existingBrand = await this.prisma.brand.findUnique({
      where: { name: createBrandDto.name },
    });
    if (existingBrand) throw new BadRequestException('Brand already exists');
    const brand = await this.prisma.brand.create({ data: createBrandDto });
    await setCache(`brand:${brand.id}`, brand, 600);
    await deleteCache('brands:all');
    return brand;
  }

  async findAll() {
    const cached = await getCache('brands:all');
    if (cached) return cached;
    const brands = await this.prisma.brand.findMany();
    await setCache('brands:all', brands, 300);
    return brands;
  }

  async findOne(id: string) {
    const cached = await getCache(`brand:${id}`);
    if (cached) return cached;
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    await setCache(`brand:${id}`, brand, 600);
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    const existingBrand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!existingBrand) throw new NotFoundException('Brand not found');
    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
    await setCache(`brand:${id}`, updatedBrand, 600);
    await deleteCache('brands:all');
    return updatedBrand;
  }

  async remove(id: string) {
    const existingBrand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!existingBrand) throw new NotFoundException('Brand not found');
    await this.prisma.brand.delete({ where: { id } });
    await deleteCache(`brand:${id}`);
    await deleteCache('brands:all');
    return { message: 'Brand deleted successfully' };
  }
}
