import { User } from "@/model.ts";
import { UserView } from "@santorini/shared";

export class UserDTO implements UserView {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.displayName = user.username || user.display_name || "";
    this.createdAt = user.created_at.toISOString();
  }
}
