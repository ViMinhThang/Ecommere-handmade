import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(['ROLE_USER', 'ROLE_SELLER', 'ROLE_ADMIN'], { each: true })
  roles?: ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[];

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

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
  @IsBoolean()
  isEmailVerified?: boolean;
}
