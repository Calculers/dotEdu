export interface UpdateUserDTO {
    userId: string;
    // Personal Details
    username?: string;
    displayName?: string;
    personalEmail?: string;
    institutionalEmail?: string;
    phoneNumber?: string;
    profilePicture?: string;
    gender?: string;
    dateOfBirth?: Date;
    
    // Institutional Details (can be an array to update multiple institutions)
    institutionalDetails?: {
        institutionName?: string;
        department?: string;
        batch?: string;
        rollNumber?: string;
        idCardImage?: string;
    };
    
    // Display Details
    bio?: string;
    interests?: string[];
    socialLinks?: {
        linkedin?: string;
        github?: string;
        twitter?: string;
        others?: string[];
    };
}
