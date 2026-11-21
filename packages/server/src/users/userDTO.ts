import { UserId } from "@santorini/engine";
import { UserView } from "@santorini/shared";

import { UserRow } from "@/model.ts";

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
