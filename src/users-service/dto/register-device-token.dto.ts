import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'FCM token is required' })
  token: string;

  @IsString()
  @IsOptional() // Optional - will be auto-detected from User-Agent if not provided
  @IsIn(['android', 'ios', 'web'], { message: 'Platform must be android, ios, or web' })
  platform?: 'android' | 'ios' | 'web';

  @IsString()
  @IsOptional()
  deviceId?: string; // Unique device identifier

  @IsString()
  @IsOptional()
  deviceName?: string; // User-friendly device name (e.g., "John's iPhone")
}
