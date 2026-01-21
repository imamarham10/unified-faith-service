import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  name: string;

  @IsString({ message: 'Slug must be a string' })
  @IsNotEmpty({ message: 'Slug is required' })
  @MinLength(3, { message: 'Slug must be at least 3 characters long' })
  slug: string;

  @IsString({ message: 'Resource must be a string' })
  @IsNotEmpty({ message: 'Resource is required' })
  resource: string;

  @IsString({ message: 'Action must be a string' })
  @IsNotEmpty({ message: 'Action is required' })
  action: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;
}
