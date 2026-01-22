export interface UserPreferencesResponseDto {
    id: string;
    userId: string;
    faith?: string;
    language?: string;
    countryCode?: string;
    timezone?: string;
    notificationPreferences?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
        dailyPacket?: boolean;
        aiGuru?: boolean;
    };
    contentPreferences?: {
        showAds?: boolean;
        audioQuality?: 'standard' | 'high' | 'premium';
        downloadQuality?: 'standard' | 'high';
    };
    createdAt: Date;
    updatedAt: Date;
}
