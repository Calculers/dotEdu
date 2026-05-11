import { Request, Response, NextFunction } from "express";
import { ITokenService } from "../../domain/services/ITokenService";

declare global {
    namespace Express {
        interface Request {
            user?: { id: string };
        }
    }
}

export function createAuthMiddleware(tokenService: ITokenService) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "No token provided",
                });
            }

            const decoded = await tokenService.verifyToken(token);

            if (!decoded) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token",
                });
            }

            req.user = { id: decoded.userId };
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Authentication failed",
            });
        }
    };
}
