export class users{
    constructor(
        id :string,
        personalDetails : {
            username :string,
            displayName :string,
            personalEmail:string,
            institutionalEmail:string,
            phoneNumber:string,
            profilePicture:string,
            gender:string,
            dateOfBirth:Date,
        },
        institutionalDetails : {
            institutionName:string,
            department:string,
            batch:string,
            rollNumber:string,
            idCardImage:string,
        }[],
        authenticationDetails : {
            passwordHash:string,
            passwordSalt:string,
            lastLogin:Date,
        },
        displayDetails : {
            bio:string,
            interests:string[],
            socialLinks:{
                linkedin:string,
                github:string,
                twitter:string,
                others:string[],
            },
        },
        activities : {
            followers :{
                count:number,
                list:string[],//user ids
            },
            following :{
                count:number,
                list:string[],//user ids
            },
            postLikes :{
                count:number,
                list:string[],//post ids
            },
            comments :{
                count:number,
                list:string[],//comment ids
            },
        },
        
    ){}
}