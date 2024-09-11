import { UserDTO } from "../../../src/users/userDTO";
import { app } from "../../../src/app";
import request from "supertest";

export async function generateTestUser() {
  const randomUsername = Math.random().toString(36).substring(7);
  const randomPassword = Math.random().toString(36).substring(7);
  const userData = {
    username: randomUsername,
    password: randomPassword,
  };

  const createUserResponse = await request(app).post("/users").send(userData).expect(201);
  const user = createUserResponse.body as UserDTO;

  return { user: user, userData: userData };
}

export async function createUserWithLogin() {
  const { user, userData } = await generateTestUser();

  const loginResponse = await request(app)
    .post("/session")
    .send({ username: userData.username, password: userData.password })
    .expect(200);

  const cookieHeaders = loginResponse.headers["set-cookie"];
  const cookies = cookieHeaders.toString().split(";");
  const tokenHeader = cookies.find((cookie) => cookie.startsWith("token=")) as string;
  const token = tokenHeader.replace("token=", "");

  return { user: user, token: token };
}
