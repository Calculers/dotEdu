import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { UpdateUserDTO } from "../../dtos/UpdateUserDTO";

export class UpdateUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(data: UpdateUserDTO) {
        const { userId, ...updateData } = data;

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const updatedUser = { ...user };

        if (updateData.username || updateData.displayName || updateData.personalEmail ||
            updateData.institutionalEmail || updateData.phoneNumber || updateData.profilePicture ||
            updateData.gender || updateData.dateOfBirth) {
            updatedUser.personalDetails = {
                ...user.personalDetails,
                ...(updateData.username && { username: updateData.username }),
                ...(updateData.displayName && { displayName: updateData.displayName }),
                ...(updateData.personalEmail && { personalEmail: updateData.personalEmail }),
                ...(updateData.institutionalEmail && { institutionalEmail: updateData.institutionalEmail }),
                ...(updateData.phoneNumber && { phoneNumber: updateData.phoneNumber }),
                ...(updateData.profilePicture && { profilePicture: updateData.profilePicture }),
                ...(updateData.gender && { gender: updateData.gender }),
                ...(updateData.dateOfBirth && { dateOfBirth: updateData.dateOfBirth }),
            };
        }

        if (updateData.institutionalDetails) {
            if (user.institutionalDetails && user.institutionalDetails.length > 0) {
                updatedUser.institutionalDetails = [
                    {
                        ...user.institutionalDetails[0],
                        ...updateData.institutionalDetails,
                    },
                ];
            } else {
                updatedUser.institutionalDetails = [updateData.institutionalDetails];
            }
        }

        if (updateData.bio || updateData.interests || updateData.socialLinks) {
            updatedUser.displayDetails = {
                ...user.displayDetails,
                ...(updateData.bio && { bio: updateData.bio }),
                ...(updateData.interests && { interests: updateData.interests }),
                ...(updateData.socialLinks && {
                    socialLinks: {
                        ...user.displayDetails.socialLinks,
                        ...updateData.socialLinks,
                    },
                }),
            };
        }

        const result = await this.userRepository.update(userId, updatedUser);

        return {
            id: result.id,
            email: result.email,
            personalDetails: result.personalDetails,
            institutionalDetails: result.institutionalDetails,
            displayDetails: result.displayDetails,
        };
    }
}
