import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export const sellerSearchSortByOptions = [
  'relevance',
  'newest',
  'productCount',
  'rating',
] as const;

export const sellerSearchSortOrderOptions = ['asc', 'desc'] as const;

export type SellerSearchSortBy = (typeof sellerSearchSortByOptions)[number];
export type SellerSearchSortOrder =
  (typeof sellerSearchSortOrderOptions)[number];

export class SearchSellersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(sellerSearchSortByOptions)
  sortBy?: SellerSearchSortBy = 'relevance';

  @IsOptional()
  @IsIn(sellerSearchSortOrderOptions)
  sortOrder?: SellerSearchSortOrder = 'desc';
}
