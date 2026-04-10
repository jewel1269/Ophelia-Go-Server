import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('/all')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all reviews [ADMIN, SUPER_ADMIN]',
    description:
      'ADMIN / SUPER_ADMIN only. Returns all reviews across all products for moderation purposes.',
  })
  @ApiResponse({ status: 200, description: 'List of all reviews' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  allReviews() {
    const reviews = this.reviewService.allReviews();
    return reviews;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get reviews for a product ',
    description: 'Public route. Returns all reviews for the given product ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Product reviews list' })
  findAll(@Param('id') productId: string) {
    const reviews = this.reviewService.findAll(productId);
    return reviews;
  }

  @Post(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a review for a product [CUSTOMER]',
    description:
      'CUSTOMER only. Creates a new review (comment + rating + optional images) for a product.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID being reviewed',
    example: 'a3b8c1e2-1234-4567-89ab-cdef01234567',
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customers only' })
  create(
    @CurrentUser() user: any,
    @Param('id') productId: string,
    @Body() reviewData: CreateReviewDto,
  ) {
    const userId = user.sub;
    const review = this.reviewService.create(userId, productId, reviewData);
    return review;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a review ',
    description: 'Updates a review by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review UUID',
    example: 'f1e2d3c4-1234-4567-89ab-cdef01234567',
  })
  @ApiBody({ type: UpdateReviewDto })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Delete('/delete/:id')
  @ApiOperation({
    summary: 'Delete a review ',
    description: 'Deletes a review by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review UUID',
    example: 'f1e2d3c4-1234-4567-89ab-cdef01234567',
  })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  remove(@Param('id') id: string) {
    return this.reviewService.remove(id);
  }
}
