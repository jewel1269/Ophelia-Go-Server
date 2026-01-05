import { Type } from 'class-transformer';
import { IsString, IsUUID, IsOptional, IsUrl } from 'class-validator';

export class CategoryResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Type(() => CategoryResponseDto)
  children?: CategoryResponseDto[];
}
