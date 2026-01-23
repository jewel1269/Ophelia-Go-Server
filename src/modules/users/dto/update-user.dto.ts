import { PartialType } from '@nestjs/mapped-types';
import { UpdateUserDtoV2 } from './create-user.dto';

export class UpdateUserDto extends PartialType(UpdateUserDtoV2) {}
