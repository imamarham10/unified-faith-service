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
}

export class UpdateCounterDto {
  @IsOptional()
  @IsNumber()
  count?: number;
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
