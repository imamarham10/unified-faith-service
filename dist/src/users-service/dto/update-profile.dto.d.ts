declare class AddressDto {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}
declare class SocialLinksDto {
    facebook?: string;
    instagram?: string;
    twitter?: string;
}
export declare class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: AddressDto;
    socialLinks?: SocialLinksDto;
}
export {};
