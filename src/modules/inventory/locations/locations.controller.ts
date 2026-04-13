import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('Inventory — Locations')
@ApiBearerAuth()
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('inventory/locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a warehouse location [ADMIN]' })
  create(@Body() dto: CreateLocationDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all warehouse locations [ADMIN]' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a warehouse location [ADMIN]' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a warehouse location [ADMIN]' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a warehouse location [ADMIN]',
    description: 'Hard delete. Blocked if location has any stock movement history — deactivate instead.',
  })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
