import { eventEmitter } from "../Events";
import { main } from "../Main";

const gameManager = main.getGameManager();
const networkManager = main.getNetworkManager();

/* -------------------------------------------------------------------------- */
/*                               AUTHENTICATION                               */
/* -------------------------------------------------------------------------- */
const loginModal = document.getElementById("loginModal");
if (loginModal === null || loginModal === undefined) {
  throw new Error("Login modal not found.");
}
const loginMenuButton = document.getElementById("loginButton");
if (loginMenuButton === null || loginMenuButton === undefined) {
  throw new Error("Login button not found.");
}
const span = document.getElementsByClassName("close")[0];
if (span === null || span === undefined) {
  throw new Error("Close button not found.");
}

loginMenuButton.onclick = function () {
  loginModal.style.display = "block";
};

(span as HTMLButtonElement).onclick = function () {
  loginModal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target === loginModal) {
    loginModal.style.display = "none";
  }
};

const loginForm = document.getElementById("loginForm");
if (loginForm === null || loginForm === undefined) { throw new Error("Login form not found."); }

loginForm.onsubmit =
  async function (event: Event) {
    event.preventDefault();
    const formData = new FormData(this as HTMLFormElement);
    const username = formData.get("username") as string;

    const login = await networkManager.login(username);

    if (login) {
      loginModal.style.display = "none";
      gameManager.setUsername(username);
    } else {
      alert("Failed to login");
    }
  };

const create_user_form = document.getElementById("create-user-form");
create_user_form?.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(
    document.getElementById("create-user-form") as HTMLFormElement,
  );
  const username = formData.get("username") as string;
  if (!username) {
    return;
  }

  const success = await networkManager.createUser(username);
  if (success) {
    loginModal.style.display = "none";
    gameManager.setUsername(username);
    create_user_form.dispatchEvent(new CustomEvent("username-update", { bubbles: true }));
  }
  console.log("User Created and username set to:", gameManager.getUsername());
});

const logoutButton = document.getElementById("logout-button");
if (logoutButton === null || logoutButton === undefined) { throw new Error("Logout button not found."); }
logoutButton.addEventListener("click", () => {
  gameManager.resetUsername();
  loginModal.style.display = "block";
});

const usernameText = document.getElementById("username-show") as HTMLTextAreaElement;
usernameText.textContent = gameManager.getUsername();
eventEmitter.on("username-update", () => {
  usernameText.textContent = gameManager.getUsername();
});


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
  } catch (e: any) {
    console.error(e);
    alert(e.message);
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

async function loginOnStartup() {
  if (loginModal === null || loginModal === undefined) {
    throw new Error("Login modal not found.");
  }

  const username = gameManager.getUsername();
  if (!username) {
    console.log("Username not set.");
    loginModal.style.display = "block";
    return
  }

  const loginSucceeded = await networkManager.login(username);
  if (loginSucceeded) {
    console.log("Session available for: ", gameManager.getUsername());
    loginModal.style.display = "none";
  } else {
    console.warn("Failed to login with username: ", username);
    gameManager.resetUsername();
    loginModal.style.display = "block";
  }
}

async function rejoinGameOnStartup(username: string | null) {
  const gameID = gameManager.getGameID();
  if (!gameID) {
    console.log("No saved Game ID.");
  } else if (username && await networkManager.joinGame(username, gameID)) {
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
    await loginOnStartup();

    await rejoinGameOnStartup(gameManager.getUsername());

  } catch (error) {
    console.error("Startup failed:", error);
  }
}

Startup();