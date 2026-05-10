import { IsInt, IsOptional, Min, IsString, IsBoolean } from 'class-validator';

export class UpdateJapaCounterDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  count?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  targetCount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
