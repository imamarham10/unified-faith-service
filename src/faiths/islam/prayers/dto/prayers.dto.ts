import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetPrayerTimesDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lng: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  method?: string;
}

export class LogPrayerDto {
  @IsNotEmpty()
  @IsEnum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  prayerName: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(['on_time', 'late', 'qada', 'missed'])
  status: string;
}
