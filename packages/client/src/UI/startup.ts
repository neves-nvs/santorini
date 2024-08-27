import { eventEmitter } from "../Events";
import { main } from "../Main";

const gameManager = main.getGameManager();
const networkManager = main.getNetworkManager();

/* -------------------------------------------------------------------------- */
/*                                    GAME                                    */
/* -------------------------------------------------------------------------- */

const refreshGamesButton = document.getElementById("refresh-games-button");
refreshGamesButton?.addEventListener("click", async () => {
  try {
    const games = await networkManager.getGames();
    const gamesList = document.getElementById("games") as HTMLUListElement;
    gamesList.innerHTML = "";
    console.log(games);

    games.forEach((id: string) => {
      const listItem = document.createElement("li");
      listItem.textContent = `Game ID: ${id}`;
      listItem.onclick = () => joinGameOnClick(id);
      gamesList.appendChild(listItem);
    });
  } catch (e) {
    console.error("Failed to fetch games:", e);
  }
});

async function joinGameOnClick(gameID: string) {
  const username = gameManager.getUsername();
  if (!username) {
    console.error("Username not set.");
    alert("Please enter your name and select a color.");
    return;
  }
  const success = await networkManager.joinGame(username, gameID);
  if (!success) {
    console.error("Failed to join game.");
    alert("Failed to join game.");
    return;
  }
  console.log("Joined game with ID: ", gameID);
  gameManager.setGameID(gameID);
  networkManager.subscribeToGame(gameID, username);
}

const createGameButton = document.getElementById("create-game-button");
createGameButton?.addEventListener("click", () => {
  const amountOfPlayers = (
    document.getElementById("amount-of-players") as HTMLInputElement
  ).value;
  const username = gameManager.getUsername();
  if (!username) {
    console.error("Username not set.");
    alert("Please enter your name and select a color.");
    return;
  }
  try {
    networkManager.createGame(parseInt(amountOfPlayers), username);
  } catch (e: unknown) {
    const error = e as Error;
    console.error(error.message);
    alert(error.message);
    return;
  }
});

const gameIDText = document.getElementById("game-id") as HTMLLabelElement;
eventEmitter.on("gameId-update", () => {
  const gameID = gameManager.getGameID();
  if (!gameID) {
    gameIDText.textContent = "No game ID";
    return;
  }
  gameIDText.textContent = gameID;
});

/* -------------------------------------------------------------------------- */
/*                                   STARTUP                                  */
/* -------------------------------------------------------------------------- */

// async function loginOnStartup() {
//   if (loginModal === null || loginModal === undefined) {
//     throw new Error("Login modal not found.");
//   }

//   const username = gameManager.getUsername();
//   if (!username) {
//     console.log("Username not set.");
//     loginModal.style.display = "block";
//     return;
//   }
//   const password = gameManager.getPassword();
//   if (!password) {
//     console.log("Password not set.");
//     loginModal.style.display = "block";
//     return;
//   }

//   const loginSucceeded = await networkManager.login(username, password);
//   if (loginSucceeded) {
//     console.log("Session available for: ", gameManager.getUsername());
//     loginModal.style.display = "none";
//   } else {
//     console.warn("Failed to login with username: ", username);
//     gameManager.resetUsername();
//     loginModal.style.display = "block";
//   }
// }

async function rejoinGameOnStartup(username: string | null) {
  const gameID = gameManager.getGameID();
  if (!gameID) {
    console.log("No saved Game ID.");
  } else if (username && (await networkManager.joinGame(username, gameID))) {
    console.log("Rejoining game with ID: ", gameID);
    networkManager.subscribeToGame(gameID, username);
    eventEmitter.emit("gameId-update");
  } else {
    console.warn("Failed to rejoin game with ID: ", gameID);
    gameManager.resetGameID();
  }
}

async function Startup() {
  try {
    await rejoinGameOnStartup(gameManager.getUsername());
  } catch (error) {
    console.error("Startup failed:", error);
  }
}

Startup();
