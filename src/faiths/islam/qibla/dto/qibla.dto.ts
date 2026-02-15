import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetQiblaDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lng: number;
}
