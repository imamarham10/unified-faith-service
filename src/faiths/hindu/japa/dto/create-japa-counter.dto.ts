import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateJapaCounterDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  mantraSanskrit?: string;

  @IsString()
  @IsOptional()
  mantraEnglish?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetCount?: number;

  @IsString()
  @IsOptional()
  deityKey?: string;
}
