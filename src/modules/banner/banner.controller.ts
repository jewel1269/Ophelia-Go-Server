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

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  create(@Body() createBannerDto: CreateBannerDto) {
    const banner = this.bannerService.create(createBannerDto);
    return banner;
  }

  @Get()
  findAll() {
    const result = this.bannerService.findAll();
    return result;
  }

  @Get('/active')
  findActiveBanner() {
    const result = this.bannerService.findActiveBanner();
    return result;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch('/status/:id')
  update(@Param('id') id: string) {
    return this.bannerService.updateStatus(id);
  }

  @Delete('/delete/:id')
  remove(@Param('id') id: string) {
    const result = this.bannerService.remove(id);
    return result;
  }
}
