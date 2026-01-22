declare class NotificationPreferencesDto {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    dailyPacket?: boolean;
    aiGuru?: boolean;
}
declare class ContentPreferencesDto {
    showAds?: boolean;
    audioQuality?: 'standard' | 'high' | 'premium';
    downloadQuality?: 'standard' | 'high';
}
export declare class UpdatePreferencesDto {
    faith?: string;
    language?: string;
    countryCode?: string;
    timezone?: string;
    notificationPreferences?: NotificationPreferencesDto;
    contentPreferences?: ContentPreferencesDto;
}
export {};
