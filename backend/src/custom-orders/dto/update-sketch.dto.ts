import { IsOptional, IsString } from 'class-validator';

export class UpdateSketchDto {
  @IsOptional()
  @IsString()
  sketchImageUrl?: string;

  @IsOptional()
  @IsString()
  artisanNote?: string;
}
