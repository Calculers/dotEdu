import { ITokenService } from "../../../domain/services/ITokenService";

export class JwtTokenService implements ITokenService {
    private jwt: any;
    private secret: string;

    constructor(jwt?: any, secret?: string) {
        this.jwt = jwt;
        this.secret = secret || process.env.JWT_SECRET || "your-secret-key";
    }

    async generateToken(userId: string): Promise<string> {
        try {
            if (this.jwt) {
                const token = this.jwt.sign(
                    { userId },
                    this.secret,
                    { expiresIn: "7d" }
                );
                return token;
            }

            throw new Error("JWT library not initialized");
        } catch (error) {
            throw new Error(`Failed to generate token: ${error}`);
        }
    }

    async verifyToken(token: string): Promise<{ userId: string } | null> {
        try {
            if (this.jwt) {
                const decoded = this.jwt.verify(token, this.secret);
                return { userId: decoded.userId };
            }

            throw new Error("JWT library not initialized");
        } catch (error) {
            return null;
        }
    }
}
