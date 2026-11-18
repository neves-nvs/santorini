import { UserId } from "@santorini/engine";
import { UserRow } from "@/model.ts";
import { UserView } from "@santorini/shared";

export class UserDTO implements UserView {
  id: UserId;
  username: string;
  displayName: string;
  createdAt: string;

  constructor(user: UserRow) {
    this.id = user.id;
    this.username = user.username;
    this.displayName = user.username || user.display_name || "";
    this.createdAt = user.created_at.toISOString();
  }
}
