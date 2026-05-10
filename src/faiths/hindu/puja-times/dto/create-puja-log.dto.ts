import { IsString, IsIn, IsDateString } from 'class-validator';

export class CreatePujaLogDto {
  @IsString()
  @IsIn(['pratah', 'madhyahna', 'sayam'])
  sandhya: 'pratah' | 'madhyahna' | 'sayam';

  @IsDateString()
  date: string;

  @IsString()
  @IsIn(['on_time', 'late', 'missed'])
  status: 'on_time' | 'late' | 'missed';
}
