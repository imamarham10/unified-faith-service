import { IsString } from 'class-validator';

export class CreateStotraFavoriteDto {
  @IsString()
  stotraId: string;
}
