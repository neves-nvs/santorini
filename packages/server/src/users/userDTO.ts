import { User } from "../model";

export class UserDTO {
  id: number;
  username: string;
  displayName: string;
  createdAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.displayName = user.username || user.display_name || "";
    this.createdAt = user.created_at;
  }
}
