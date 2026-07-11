import { IsString } from 'class-validator';

export class CreateTempleFavoriteDto {
  @IsString()
  templeId: string;
}
