import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @IsString({ message: 'Slug must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'Slug must be at least 2 characters long' })
  slug?: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;
}
