import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an analytics record ',
    description:
      'Placeholder endpoint. Creates an analytics record. (Intended for ADMIN dashboards once implemented.)',
  })
  @ApiBody({ type: CreateAnalyticsDto })
  @ApiResponse({ status: 201, description: 'Analytics record created' })
  create(@Body() createAnalyticsDto: CreateAnalyticsDto) {
    return this.analyticsService.create(createAnalyticsDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List analytics records ',
    description: 'Placeholder endpoint that lists analytics records.',
  })
  @ApiResponse({ status: 200, description: 'Analytics list' })
  findAll() {
    return this.analyticsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an analytics record by ID ',
    description: 'Placeholder endpoint that returns a single analytics record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Analytics record numeric id',
  })
  findOne(@Param('id') id: string) {
    return this.analyticsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an analytics record ',
    description: 'Placeholder endpoint that updates an analytics record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Analytics record numeric id',
  })
  update(
    @Param('id') id: string,
    @Body() updateAnalyticsDto: UpdateAnalyticsDto,
  ) {
    return this.analyticsService.update(+id, updateAnalyticsDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an analytics record ',
    description: 'Placeholder endpoint that deletes an analytics record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Analytics record numeric id',
  })
  remove(@Param('id') id: string) {
    return this.analyticsService.remove(+id);
  }
}
