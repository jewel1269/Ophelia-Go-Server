import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './user-address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
