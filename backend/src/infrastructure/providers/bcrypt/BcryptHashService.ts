import { IHashService } from "../../../domain/services/IHashService";

export class BcryptHashService implements IHashService {
    private bcrypt: any;

    constructor(bcrypt?: any) {
        this.bcrypt = bcrypt;
    }

    async hash(password: string): Promise<{ hash: string; salt: string }> {
        try {
            const saltRounds = 10;
            
            if (this.bcrypt) {
                const salt = await this.bcrypt.genSalt(saltRounds);
                const hash = await this.bcrypt.hash(password, salt);
                return { hash, salt };
            }

            throw new Error("Bcrypt library not initialized");
        } catch (error) {
            throw new Error(`Failed to hash password: ${error}`);
        }
    }

    async verify(password: string, hash: string, salt: string): Promise<boolean> {
        try {
            if (this.bcrypt) {
                return await this.bcrypt.compare(password, hash);
            }

            throw new Error("Bcrypt library not initialized");
        } catch (error) {
            throw new Error(`Failed to verify password: ${error}`);
        }
    }
}
