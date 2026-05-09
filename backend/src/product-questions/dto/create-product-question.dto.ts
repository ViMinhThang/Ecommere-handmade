import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateProductQuestionDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 500)
  question: string;
}
