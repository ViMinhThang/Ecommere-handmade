import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  sellerTitle?: string;

  @IsOptional()
  @IsString()
  sellerBio?: string;

  @IsOptional()
  @IsString()
  sellerAbout?: string;

  @IsOptional()
  @IsString()
  sellerHeroImage?: string;

  @IsOptional()
  @IsString()
  sellerAboutImage?: string;

  @IsOptional()
  @IsString()
  sellerStat1Label?: string;

  @IsOptional()
  @IsString()
  sellerStat1Value?: string;

  @IsOptional()
  @IsString()
  sellerStat2Label?: string;

  @IsOptional()
  @IsString()
  sellerStat2Value?: string;

  @IsOptional()
  @IsString()
  craftSpecialty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  craftExperienceYears?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  craftMaterials?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shopReturnPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shopShippingPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  shopProcessingTime?: string;
}
