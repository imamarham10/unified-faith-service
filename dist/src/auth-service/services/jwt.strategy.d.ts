import { Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JwtPayload } from '../dto/jwt-payload.dto';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    private readonly logger;
    constructor(authService: AuthService);
    validate(payload: JwtPayload): Promise<{
        userId: string;
        email: string;
        roles: string[];
        permissions: string[];
    }>;
}
export {};
