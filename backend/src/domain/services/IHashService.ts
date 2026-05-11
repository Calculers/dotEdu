export interface IHashService {
    hash(password: string): Promise<{ hash: string; salt: string }>;
    verify(password: string, hash: string, salt: string): Promise<boolean>;
}