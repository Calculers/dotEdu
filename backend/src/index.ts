import express from "express";
import dotenv from "dotenv";
import { createAuthRoutes } from "./presentation/routes/authRoutes";
import { MongoUserRepository } from "./infrastructure/repositories/MongoUserRepository";
import { BcryptHashService } from "./infrastructure/providers/bcrypt/BcryptHashService";
import { JwtTokenService } from "./infrastructure/providers/jwt/JwtTokenService";

dotenv.config();

const app = express();

app.use(express.json());

/**
 * TODO: Initialize MongoDB connection
 * const mongoClient = new MongoClient(process.env.MONGODB_URI);
 * const db = mongoClient.db("dotEdu");
 */

// For now, using mock database
const mockDb = {
    collection: (name: string) => ({
        insertOne: async (doc: any) => console.log(`Inserted into ${name}:`, doc),
        findOne: async (query: any) => console.log(`Finding in ${name}:`, query),
        findOneAndUpdate: async (query: any, update: any) =>
            console.log(`Updated in ${name}:`, query),
        deleteOne: async (query: any) => console.log(`Deleted from ${name}:`, query),
    }),
};

// TODO: Import bcrypt and jwt libraries
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";

const userRepository = new MongoUserRepository(mockDb);
const hashService = new BcryptHashService(null); // Pass bcrypt library when available
const tokenService = new JwtTokenService(null); // Pass jwt library when available

const authRoutes = createAuthRoutes(userRepository, hashService, tokenService);

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
