import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create inventory record ',
    description:
      'Placeholder endpoint. Creates an inventory record. (Intended for ADMIN use once implemented.)',
  })
  @ApiBody({ type: CreateInventoryDto })
  @ApiResponse({ status: 201, description: 'Inventory record created' })
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all inventory records ',
    description: 'Placeholder endpoint that lists inventory records.',
  })
  @ApiResponse({ status: 200, description: 'Inventory list' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an inventory record by ID ',
    description: 'Placeholder endpoint that returns a single inventory record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Inventory record numeric id',
  })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an inventory record ',
    description: 'Placeholder endpoint that updates an inventory record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Inventory record numeric id',
  })
  update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(+id, updateInventoryDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an inventory record ',
    description: 'Placeholder endpoint that deletes an inventory record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Inventory record numeric id',
  })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(+id);
  }
}
