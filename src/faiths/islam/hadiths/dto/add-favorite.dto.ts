import { IsNotEmpty, IsString } from 'class-validator';

export class AddFavoriteHadithDto {
  @IsNotEmpty()
  @IsString()
  hadithId: string;
}
