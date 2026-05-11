import { IUserRepository } from "../../domain/repositories/IUserRepository";

export class MongoUserRepository implements IUserRepository {
    constructor(private db: any) {}

    async create(data: any): Promise<any> {
        try {
            const user = {
                id: this.generateId(),
                email: data.email,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            // Simulate MongoDB save
            await this.db.collection("users").insertOne(user);
            return user;
        } catch (error) {
            throw new Error(`Failed to create user: ${error}`);
        }
    }

    async findByEmail(email: string): Promise<any | null> {
        try {
            return await this.db.collection("users").findOne({ email });
        } catch (error) {
            throw new Error(`Failed to find user: ${error}`);
        }
    }

    async findById(id: string): Promise<any | null> {
        try {
            return await this.db.collection("users").findOne({ id });
        } catch (error) {
            throw new Error(`Failed to find user: ${error}`);
        }
    }

    async update(id: string, data: any): Promise<any> {
        try {
            const updated = {
                ...data,
                updatedAt: new Date(),
            };

            const result = await this.db.collection("users").findOneAndUpdate(
                { id },
                { $set: updated },
                { returnDocument: "after" }
            );

            return result.value;
        } catch (error) {
            throw new Error(`Failed to update user: ${error}`);
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.db.collection("users").deleteOne({ id });
        } catch (error) {
            throw new Error(`Failed to delete user: ${error}`);
        }
    }

    private generateId(): string {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
