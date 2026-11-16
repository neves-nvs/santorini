import { NewGame } from "@/model.ts";
import { UserDTO } from "@/users/userDTO.ts";
import { specApp as app } from "./specApp.ts";
import { randomBytes } from "crypto";
import request from "supertest";

export async function generateTestUser() {
  const randomUsername = randomBytes(6).toString("hex");
  const randomPassword = randomBytes(6).toString("hex");
  const userData = {
    username: randomUsername,
    password: randomPassword,
  };

  const createUserResponse = await request(app).post("/users").send(userData).expect(201);
  const user = createUserResponse.body as UserDTO;

  return { user: user, userData: userData };
}

export async function createTestUserWithLogin() {
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

function generateTestNewGameData(): NewGame {
  const newGameData = {
    player_count: 2,
  } as NewGame;

  return newGameData;
}

export async function createTestGame(jwtToken: string): Promise<number> {
  const newGameData = generateTestNewGameData();

  const response = await request(app).post("/games").set("Cookie", `token=${jwtToken}`).send(newGameData).expect(200);

  return response.body.gameId;
}

// HTTP join endpoint is disabled - use WebSocket join instead
// export async function addTestPlayerToGame(gameId: number, jwtToken: string) {
//   await request(app).post(`/games/${gameId}/players`).set("Cookie", `token=${jwtToken}`).expect(201);
// }
