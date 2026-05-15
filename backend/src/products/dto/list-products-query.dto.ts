import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListProductsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readyToShip?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'price', 'name', 'viewCount', 'stock', 'soldQuantity'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @IsString()
  order?: 'asc' | 'desc';
}
