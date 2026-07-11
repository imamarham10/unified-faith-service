import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

// Request DTOs
export class CreateCounterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phrase: string; // Can be Arabic or English

  @IsOptional()
  @IsNumber()
  targetCount?: number;

  // Optional client-supplied bilingual text, used for custom phrases the
  // dictionary can't resolve (otherwise stripped by the whitelist pipe and
  // the counter name ends up in the Arabic slot).
  @IsOptional()
  @IsString()
  phraseArabic?: string;

  @IsOptional()
  @IsString()
  phraseTranslit?: string;

  @IsOptional()
  @IsString()
  phraseTransliteration?: string;
}

export class UpdateCounterDto {
  // Delta. When present alone, treated as "increment by N".
  @IsOptional()
  @IsNumber()
  count?: number;

  // Absolute set. Used for reset (setCount: 0) or manual overrides.
  @IsOptional()
  @IsNumber()
  setCount?: number;

  @IsOptional()
  @IsNumber()
  targetCount?: number;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateGoalDto {
  @IsNotEmpty()
  @IsString()
  phrase: string; // Can be Arabic or English

  @IsNotEmpty()
  @IsNumber()
  targetCount: number;

  @IsNotEmpty()
  @IsEnum(['daily', 'weekly', 'monthly'])
  period: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Response DTOs
export class DhikrCounterResponseDto {
  id: string;
  userId: string;
  name: string;
  phraseArabic: string;
  phraseTranslit?: string;
  phraseEnglish: string;
  count: number;
  targetCount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DhikrGoalResponseDto {
  id: string;
  userId: string;
  phraseArabic: string;
  phraseTranslit?: string;
  phraseEnglish: string;
  targetCount: number;
  period: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export class DhikrHistoryResponseDto {
  id: string;
  userId: string;
  phraseArabic: string;
  phraseTranslit?: string;
  phraseEnglish: string;
  count: number;
  date: Date;
  createdAt: Date;
}
