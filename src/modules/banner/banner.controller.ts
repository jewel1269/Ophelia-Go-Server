import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Banners')
@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a banner ',
    description:
      'Creates a new banner. (Intended to be used by ADMIN via the dashboard; no guard currently applied in code.)',
  })
  @ApiBody({ type: CreateBannerDto })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  create(@Body() createBannerDto: CreateBannerDto) {
    const banner = this.bannerService.create(createBannerDto);
    return banner;
  }

  @Get()
  @ApiOperation({
    summary: 'List all banners ',
    description: 'Returns all banners.',
  })
  @ApiResponse({ status: 200, description: 'List of banners' })
  findAll() {
    const result = this.bannerService.findAll();
    return result;
  }

  @Get('/active')
  @ApiOperation({
    summary: 'Get the active banner ',
    description:
      'Public route. Returns the currently active banner(s) for display on the storefront.',
  })
  @ApiResponse({ status: 200, description: 'Active banner(s)' })
  findActiveBanner() {
    const result = this.bannerService.findActiveBanner();
    return result;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a banner by ID ',
    description: 'Returns a single banner by UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Banner UUID',
    example: 'ab12cd34-5678-90ef-abcd-1234567890ab',
  })
  @ApiResponse({ status: 200, description: 'Banner found' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch('/status/:id')
  @ApiOperation({
    summary: 'Toggle banner active status ',
    description:
      'Toggles the active status of a banner. (Intended for ADMIN; no guard currently applied in code.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Banner UUID',
    example: 'ab12cd34-5678-90ef-abcd-1234567890ab',
  })
  @ApiResponse({ status: 200, description: 'Banner status updated' })
  update(@Param('id') id: string) {
    return this.bannerService.updateStatus(id);
  }

  @Delete('/delete/:id')
  @ApiOperation({
    summary: 'Delete a banner ',
    description:
      'Deletes a banner by UUID. (Intended for ADMIN; no guard currently applied in code.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Banner UUID',
    example: 'ab12cd34-5678-90ef-abcd-1234567890ab',
  })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  remove(@Param('id') id: string) {
    const result = this.bannerService.remove(id);
    return result;
  }
}
