import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CheckoutShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  ward: string;
}

export class CheckoutDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CheckoutShippingAddressDto)
  shippingAddress?: CheckoutShippingAddressDto;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  rewardPointsToRedeem?: number;
}
