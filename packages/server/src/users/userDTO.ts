import { User } from "../model";

export class UserDTO {
  displayName: string;

  constructor(user: User) {
    if (user.username) {
      this.displayName = user.username;
    } else if (user.display_name) {
      this.displayName = user.display_name;
    } else {
      this.displayName = "";
    }
  }
}
