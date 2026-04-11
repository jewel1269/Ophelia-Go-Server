import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a file record ',
    description:
      'Placeholder endpoint. Creates a file record. (Intended for ADMIN once implemented.)',
  })
  @ApiBody({ type: CreateFileDto })
  @ApiResponse({ status: 201, description: 'File record created' })
  create(@Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all file records ',
    description: 'Placeholder endpoint that lists file records.',
  })
  @ApiResponse({ status: 200, description: 'File list' })
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a file record by ID ',
    description: 'Placeholder endpoint that returns a single file record.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'File record numeric id' })
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a file record ',
    description: 'Placeholder endpoint that updates a file record.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'File record numeric id' })
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(+id, updateFileDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a file record ',
    description: 'Placeholder endpoint that deletes a file record.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'File record numeric id' })
  remove(@Param('id') id: string) {
    return this.filesService.remove(+id);
  }
}
