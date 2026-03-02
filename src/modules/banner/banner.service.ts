import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBannerDto } from './dto/create-banner.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBannerDto: CreateBannerDto) {
    console.log('Backend: Creating Banner with data:', createBannerDto);
    return await this.prisma.banner.create({
      data: {
        ...createBannerDto,
        position: createBannerDto.position ?? 0,
      },
    });
  }

  async findAll() {
    return await this.prisma.banner.findMany({
      orderBy: {
        position: 'asc',
      },
    });
  }

  async findActiveBanner() {
    const banner = await this.prisma.banner.findMany({
      where: {
        isActive: true,
      },
    });
    return banner;
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return banner;
  }

  async updateStatus(id: string) {
    const banner = await this.findOne(id);
    return await this.prisma.banner.update({
      where: { id },
      data: {
        isActive: !banner.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.prisma.banner.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string) {
    const banner = await this.findOne(id);
    return await this.prisma.banner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });
  }
}
