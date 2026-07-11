import { IsString, IsOptional } from 'class-validator';

export class CreateBookmarkDto {
  @IsString()
  verseId: string;

  @IsString()
  @IsOptional()
  note?: string;
}
