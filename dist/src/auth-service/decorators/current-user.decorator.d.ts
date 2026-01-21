export interface CurrentUserData {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
