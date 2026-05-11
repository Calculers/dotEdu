import express, { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { RegisterUseCase } from "../../application/use-cases/auth/RegisterUseCase";
import { LoginUseCase } from "../../application/use-cases/auth/LoginUseCase";
import { UpdateUserUseCase } from "../../application/use-cases/auth/UpdateUserUseCase";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { IHashService } from "../../domain/services/IHashService";
import { ITokenService } from "../../domain/services/ITokenService";
import { createAuthMiddleware } from "../middlewares/AuthMiddleware";

export function createAuthRoutes(
    userRepository: IUserRepository,
    hashService: IHashService,
    tokenService: ITokenService,
): Router {
    const router = express.Router();

    const registerUseCase = new RegisterUseCase(userRepository, hashService, tokenService);
    const loginUseCase = new LoginUseCase(userRepository, hashService, tokenService);
    const updateUserUseCase = new UpdateUserUseCase(userRepository);

    const authController = new AuthController(registerUseCase, loginUseCase, updateUserUseCase);
    const authMiddleware = createAuthMiddleware(tokenService);

    router.post("/register", (req, res) => authController.register(req, res));
    router.post("/login", (req, res) => authController.login(req, res));
    router.put("/user/:id", authMiddleware, (req, res) => authController.updateUser(req, res));
    router.put("/user", authMiddleware, (req, res) => authController.updateUser(req, res));

    return router;
}

export { AuthController };
