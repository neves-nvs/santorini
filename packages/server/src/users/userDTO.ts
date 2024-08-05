import { User } from "../models";

export class UserDTO {
    username: string;
    displayName: string | null;

    constructor(user: User) {
        this.username = user.username;
        this.displayName = user.displayName
    }
}