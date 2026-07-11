import { IsString } from 'class-validator';

export class CreateStoryFavoriteDto {
  @IsString()
  storyId: string;
}
