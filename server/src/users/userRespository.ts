import { User } from "./user";

export class userRepository {
  private static users: User[] = [];

  static createUser(username: string) {
    const existingUser = this.users.find(
      user => user.getUsername() === username,
    );
    if (existingUser) {
      throw new Error("User already exists");
    }

    const player = new User(username);
    this.users.push(player);
  }

  static getUser(username: string) {
    return this.users.find(user => user.getUsername() === username);
  }

  static getUsers() {
    return userRepository;
  }
}
