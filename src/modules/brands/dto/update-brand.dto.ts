import { PartialType } from '@nestjs/swagger';
import { UpdateBrands } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(UpdateBrands) {}
