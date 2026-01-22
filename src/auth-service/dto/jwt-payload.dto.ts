export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions: string[];
  type?: string; // 'access' or 'refresh'
  iat?: number; // issued at (standard JWT claim)
  exp?: number; // expiration (standard JWT claim)
}
