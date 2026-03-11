import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    productId: string,
    createReviewDto: CreateReviewDto,
  ) {
    try {
      return await this.prisma.review.create({
        data: {
          ...createReviewDto,
          product: { connect: { id: productId } },
          user: { connect: { id: userId } },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async allReviews() {
    try {
      return await this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(productId: string) {
    try {
      return await this.prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    try {
      return await this.prisma.review.update({
        where: { id },
        data: updateReviewDto,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.review.delete({
        where: { id },
      });
      return { message: 'Review deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
