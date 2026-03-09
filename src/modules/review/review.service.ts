import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { deleteCache, getCache, setCache } from 'src/services/cache.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

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
      await deleteCache(`reviews:${productId}`);

      return review;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(productId: string) {
    const cacheKey = `reviews:${productId}`;

    try {
      const cachedReviews = await getCache(cacheKey);
      if (cachedReviews) return cachedReviews;
      const reviews = await this.prisma.review.findMany({
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
      if (reviews.length > 0) {
        await setCache(cacheKey, reviews, 3600);
      }

      return reviews;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(
    id: string,
    productId: string,
    updateReviewDto: UpdateReviewDto,
  ) {
    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
    });
    await deleteCache(`reviews:${productId}`);
    return updatedReview;
  }

  async remove(id: string, productId: string) {
    await this.prisma.review.delete({
      where: { id },
    });
    await deleteCache(`reviews:${productId}`);
    return { message: 'Review deleted successfully' };
  }
}
