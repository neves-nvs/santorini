import { Player } from "./board";

export const userRepository: Player[] = [];

function createUser(username: string) {
  const existingUser = userRepository.find(
    user => user.getUsername() === username,
  );
  if (existingUser) {
    console.log("User already exists");
    return;
  }

  const player = new Player(username);
  userRepository.push(player);
}
