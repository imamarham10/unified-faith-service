import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCounterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phrase: string;

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
  phrase: string;

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
