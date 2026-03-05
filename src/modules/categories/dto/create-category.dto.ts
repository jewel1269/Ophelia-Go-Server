import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsUrl()
  backgroundImage?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
