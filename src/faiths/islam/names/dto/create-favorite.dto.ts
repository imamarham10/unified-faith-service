
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateFavoriteDto {
  @IsNotEmpty()
  @IsNumber()
  nameId: number;
}
