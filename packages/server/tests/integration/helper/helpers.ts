import { NewGame } from "../../../src/model";
import { UserDTO } from "../../../src/users/userDTO";
import WebSocket from "ws";
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

export function generateTestNewGameData(): NewGame {
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

export async function addTestPlayerToGameViaWebSocket(gameId: number, jwtToken: string, username: string): Promise<void> {
  // Add a small delay to ensure server is ready
  await new Promise(resolve => setTimeout(resolve, 100));

  return new Promise((resolve, reject) => {
    // Use the PORT environment variable set by test setup, not the config default
    const testPort = process.env.PORT || '8081';
    console.log(`WebSocket helper connecting to ws://localhost:${testPort} for game ${gameId}`);

    const ws = new WebSocket(`ws://localhost:${testPort}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      perMessageDeflate: false,
    });

    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        ws.close();
      }
    };

    ws.on('open', () => {
      // Send join_game message
      ws.send(JSON.stringify({
        type: 'join_game',
        payload: { gameId, username }
      }));
    });

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'game_state_update') {
          // Successfully joined and received game state
          cleanup();
          resolve();
        } else if (message.type === 'error') {
          cleanup();
          reject(new Error(message.payload || 'Failed to join game'));
        }
      } catch {
        // Ignore parsing errors, wait for the right message
      }
    });

    ws.on('error', (error: Error) => {
      console.log('WebSocket error in test helper:', error);
      cleanup();
      reject(error);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        reject(new Error('WebSocket join timeout'));
      }
    }, 5000);
  });
}
