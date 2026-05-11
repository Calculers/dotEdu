import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IHashService } from "../../../domain/services/IHashService";
import { ITokenService } from "../../../domain/services/ITokenService";
import { RegisterDTO } from "../../dtos/RegisterDTO";

export class RegisterUseCase {
    constructor(
        private userRepository: IUserRepository,
        private hashService: IHashService,
        private tokenService: ITokenService,
    ) {}

    async execute(data: RegisterDTO) {
        if (!data.email || !data.password || !data.username) {
            throw new Error("Email, password, and username are required");
        }

        const existing = await this.userRepository.findByEmail(data.email);
        if (existing) {
            throw new Error("User already exists");
        }

        const hashedPassword = await this.hashService.hash(data.password);

        const user = await this.userRepository.create({
            email: data.email,
            passwordHash: hashedPassword.hash,
            passwordSalt: hashedPassword.salt,
            personalDetails: {
                username: data.username,
                displayName: data.displayName,
                personalEmail: data.personalEmail,
                institutionalEmail: data.institutionalEmail,
                phoneNumber: data.phoneNumber,
                profilePicture: data.profilePicture,
                gender: "",
                dateOfBirth: null,
            },
            institutionalDetails: [],
            authenticationDetails: {
                lastLogin: new Date(),
            },
            displayDetails: {
                bio: "",
                interests: [],
                socialLinks: {
                    linkedin: "",
                    github: "",
                    twitter: "",
                    others: [],
                },
            },
            activities: {
                followers: { count: 0, list: [] },
                following: { count: 0, list: [] },
                postLikes: { count: 0, list: [] },
                comments: { count: 0, list: [] },
            },
        });

        const token = await this.tokenService.generateToken(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: data.username,
                displayName: data.displayName,
            },
            token,
        };
    }
}