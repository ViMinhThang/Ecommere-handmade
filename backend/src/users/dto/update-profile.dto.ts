import { IsOptional, IsString } from 'class-validator';

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
}
