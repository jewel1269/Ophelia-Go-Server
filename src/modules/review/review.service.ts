import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /** Recalculate and persist rating count + average on the parent product */
  private async syncProductRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { id: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: agg._count.id,
        averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      },
    });
  }

  async create(
    userId: string,
    productId: string,
    createReviewDto: CreateReviewDto,
  ) {
    try {
      const review = await this.prisma.review.create({
        data: {
          ...createReviewDto,
          product: { connect: { id: productId } },
          user: { connect: { id: userId } },
        },
      });
      await this.syncProductRating(productId);
      return review;
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
      const review = await this.prisma.review.update({
        where: { id },
        data: updateReviewDto,
      });
      await this.syncProductRating(review.productId);
      return review;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string) {
    try {
      const review = await this.prisma.review.findUnique({ where: { id } });
      await this.prisma.review.delete({ where: { id } });
      if (review) await this.syncProductRating(review.productId);
      return { message: 'Review deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
