import { PartialType } from '@nestjs/swagger';
import { CreateCartWithItemsDto } from './create-cart.dto';

export class UpdateCartDto extends PartialType(CreateCartWithItemsDto) {}
