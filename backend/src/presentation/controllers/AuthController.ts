import { Request, Response } from "express";
import { RegisterUseCase } from "../../application/use-cases/auth/RegisterUseCase";
import { LoginUseCase } from "../../application/use-cases/auth/LoginUseCase";
import { UpdateUserUseCase } from "../../application/use-cases/auth/UpdateUserUseCase";
import { RegisterDTO } from "../../application/dtos/RegisterDTO";
import { LoginDTO } from "../../application/dtos/LoginDTO";
import { UpdateUserDTO } from "../../application/dtos/UpdateUserDTO";

export class AuthController {
    constructor(
        private registerUseCase: RegisterUseCase,
        private loginUseCase: LoginUseCase,
        private updateUserUseCase: UpdateUserUseCase,
    ) {}

    async register(req: Request, res: Response) {
        try {
            const data: RegisterDTO = req.body;
            const result = await this.registerUseCase.execute(data);
            res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: result,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Registration failed";
            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const data: LoginDTO = req.body;
            const result = await this.loginUseCase.execute(data);
            res.status(200).json({
                success: true,
                message: "Login successful",
                data: result,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Login failed";
            res.status(401).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const userId = req.params.id || req.user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User ID is required",
                });
            }

            const data: UpdateUserDTO = {
                userId,
                ...req.body,
            };

            const result = await this.updateUserUseCase.execute(data);
            res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: result,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Update failed";
            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }
}
