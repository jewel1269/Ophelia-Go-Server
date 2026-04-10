import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a payment record ',
    description:
      'Placeholder endpoint. Creates a payment record. (Intended to be invoked by the payment gateway callback / ADMIN once implemented.)',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment record created' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all payment records ',
    description: 'Placeholder endpoint that lists payment records.',
  })
  @ApiResponse({ status: 200, description: 'Payment list' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a payment record by ID ',
    description: 'Placeholder endpoint that returns a single payment record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Payment record numeric id',
  })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a payment record ',
    description: 'Placeholder endpoint that updates a payment record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Payment record numeric id',
  })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a payment record ',
    description: 'Placeholder endpoint that deletes a payment record.',
  })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Payment record numeric id',
  })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
