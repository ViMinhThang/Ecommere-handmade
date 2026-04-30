import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class AnswerProductQuestionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 1000)
  answer: string;
}
