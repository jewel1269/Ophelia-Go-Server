import { PartialType } from '@nestjs/swagger';
import { UpdateUserDtoV2 } from './create-user.dto';

export class UpdateUserDto extends PartialType(UpdateUserDtoV2) {}
