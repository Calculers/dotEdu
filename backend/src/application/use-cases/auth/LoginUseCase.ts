import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IHashService } from "../../../domain/services/IHashService";
import { ITokenService } from "../../../domain/services/ITokenService";
import { LoginDTO } from "../../dtos/LoginDTO";

export class LoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private hashService: IHashService,
        private tokenService: ITokenService,
    ) {}

    async execute(data: LoginDTO) {
        if (!data.email || !data.password) {
            throw new Error("Email and password are required");
        }

        const user = await this.userRepository.findByEmail(data.email);
        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await this.hashService.verify(
            data.password,
            user.authenticationDetails.passwordHash,
            user.authenticationDetails.passwordSalt
        );

        if (!isPasswordValid) {
            throw new Error("Invalid email or password");
        }

        await this.userRepository.update(user.id, {
            authenticationDetails: {
                ...user.authenticationDetails,
                lastLogin: new Date(),
            },
        });

        const token = await this.tokenService.generateToken(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.personalDetails.username,
                displayName: user.personalDetails.displayName,
            },
            token,
        };
    }
}
