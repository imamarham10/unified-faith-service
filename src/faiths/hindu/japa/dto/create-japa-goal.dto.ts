import { IsString, IsInt, Min, IsIn, IsDateString } from 'class-validator';

export class CreateJapaGoalDto {
  @IsString()
  mantraSanskrit: string;

  @IsInt()
  @Min(1)
  targetCount: number;

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  period: 'daily' | 'weekly' | 'monthly';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
