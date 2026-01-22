import {
  IsString,
  IsOptional,
  IsIn,
  Length,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class NotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  sms?: boolean;

  @IsBoolean()
  @IsOptional()
  dailyPacket?: boolean;

  @IsBoolean()
  @IsOptional()
  aiGuru?: boolean;
}

class ContentPreferencesDto {
  @IsBoolean()
  @IsOptional()
  showAds?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['standard', 'high', 'premium'])
  audioQuality?: 'standard' | 'high' | 'premium';

  @IsString()
  @IsOptional()
  @IsIn(['standard', 'high'])
  downloadQuality?: 'standard' | 'high';
}

export class UpdatePreferencesDto {
  @IsString()
  @IsOptional()
  @IsIn(['hindu', 'muslim', 'christian', 'jain', 'sikh', 'buddhist'])
  faith?: string;

  @IsString()
  @IsOptional()
  @IsIn(['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa'])
  language?: string;

  @IsString()
  @IsOptional()
  @Length(2, 3)
  countryCode?: string; // ISO 3166-1 alpha-2

  @IsString()
  @IsOptional()
  timezone?: string; // IANA timezone

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentPreferencesDto)
  contentPreferences?: ContentPreferencesDto;
}
