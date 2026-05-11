export interface ITokenService {
    generateToken(userId: string): Promise<string>;
    verifyToken(token: string): Promise<{ userId: string } | null>;
}