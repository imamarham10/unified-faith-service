import { IsInt, Min, Max, IsOptional, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertToHijriDto {
  @IsOptional()
  @IsDateString()
  date?: string; // ISO date string, defaults to today if not provided

  @IsOptional()
  @IsString()
  timezone?: string; // IANA timezone (e.g., 'Asia/Kolkata', 'America/New_York')
}

export class ConvertToGregorianDto {
  @IsInt()
  @Min(1343)
  @Max(1500)
  @Type(() => Number)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  day: number;

  @IsOptional()
  @IsString()
  timezone?: string; // IANA timezone
}

export class GetGregorianMonthDto {
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @IsOptional()
  @IsString()
  timezone?: string; // IANA timezone
}

export class GetHijriMonthDto {
  @IsInt()
  @Min(1343)
  @Max(1500)
  @Type(() => Number)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @IsOptional()
  @IsString()
  timezone?: string; // IANA timezone
}

export class GetUpcomingEventsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  days?: number = 90; // Default to 90 days

  @IsOptional()
  @IsString()
  timezone?: string; // IANA timezone
}

export class GetTodayDto {
  @IsOptional()
  @IsString()
  timezone?: string; // IANA timezone, defaults to UTC if not provided
}
