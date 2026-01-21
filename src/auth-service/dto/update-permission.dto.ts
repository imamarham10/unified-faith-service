import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdatePermissionDto {
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  name?: string;

  @IsString({ message: 'Slug must be a string' })
  @IsOptional()
  @MinLength(3, { message: 'Slug must be at least 3 characters long' })
  slug?: string;

  @IsString({ message: 'Resource must be a string' })
  @IsOptional()
  resource?: string;

  @IsString({ message: 'Action must be a string' })
  @IsOptional()
  action?: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;
}
