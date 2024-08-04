import { userRepository } from "./userRepository";

async function getUsers() {
  return userRepository.getUsers();
}

function getUserById(username: string) {
  return userRepository.findUserById(username);
}

function createUser(username: string) {
  return userRepository.createUser(username);
}

export default {
  getUsers,
  getUserById,
  createUser,
};
