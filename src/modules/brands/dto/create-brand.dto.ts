export class CreateBrandsDto {
  name: string;
  slug: string;
  logo?: string;
}

export class UpdateBrands {
  name?: string;
  slug?: string;
  logo?: string;
}
