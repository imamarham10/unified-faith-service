export interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
    type?: string;
    iat?: number;
    exp?: number;
}
