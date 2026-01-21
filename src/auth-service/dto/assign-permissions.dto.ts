import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray({ message: 'Permission IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID' })
  permissionIds: string[];
}
