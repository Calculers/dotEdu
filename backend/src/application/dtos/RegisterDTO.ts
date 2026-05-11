export interface RegisterDTO {
    email: string;
    password: string;
    username: string;
    displayName: string;
    personalEmail?: string;
    institutionalEmail?: string;
    phoneNumber?: string;
    profilePicture?: string;
}
