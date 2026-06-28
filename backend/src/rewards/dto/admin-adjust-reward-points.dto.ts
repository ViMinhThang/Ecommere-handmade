import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';

export class AdminAdjustRewardPointsDto {
  @IsInt()
  @Min(-10000)
  @Max(10000)
  @NotEquals(0)
  points!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  reason!: string;
}
