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

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('/all')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  allReviews() {
    const reviews = this.reviewService.allReviews();
    return reviews;
  }

  @Get(':id')
  findAll(@Param('id') productId: string) {
    const reviews = this.reviewService.findAll(productId);
    return reviews;
  }

  @Post(':id')
  @UseGuards(JwtRefreshGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
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
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Delete('/delete/:id')
  remove(@Param('id') id: string) {
    return this.reviewService.remove(id);
  }
}
