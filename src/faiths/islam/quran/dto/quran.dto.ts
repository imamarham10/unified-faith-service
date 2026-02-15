import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddBookmarkDto {
  @IsNotEmpty()
  @IsNumber()
  surahId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  verseNumber: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SearchVersesDto {
  @IsNotEmpty()
  @IsString()
  q: string;

  @IsOptional()
  @IsString()
  lang?: string;
}
