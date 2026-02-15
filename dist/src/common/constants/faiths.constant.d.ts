export interface SupportedFaith {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'beta' | 'planned';
    features: string[];
    icon?: string;
}
export declare const SUPPORTED_FAITHS: SupportedFaith[];
