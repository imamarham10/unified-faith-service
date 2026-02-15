
import { IsString, IsNotEmpty } from 'class-validator';

export class EmotionResponseDto {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export class EmotionDetailResponseDto extends EmotionResponseDto {
  remedies: EmotionRemedyDto[];
}

export class EmotionRemedyDto {
  id: string;
  arabicText: string;
  transliteration?: string;
  translation: string;
  source: string;
}
