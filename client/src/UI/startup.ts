import { eventEmitter } from "../Events";
import { main } from "../Main";

const gameManager = main.getGameManager();
const networkManager = main.getNetworkManager();

/* -------------------------------------------------------------------------- */
/*                                    LOGIN                                   */
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

/* -------------------------------------------------------------------------- */
/*                                   STARTUP                                  */
/* -------------------------------------------------------------------------- */

const username = gameManager.getUsername();
if (!username) {
  loginModal.style.display = "block";
  console.log("Username not set.");
} else if (await networkManager.login(username)) {
  loginModal.style.display = "none";
  console.log("Session available for: ", gameManager.getUsername());
} else {
  gameManager.resetUsername();
  loginModal.style.display = "block";
  console.warn("Failed to login with username: ", username);
}

const gameID = gameManager.getGameID();
if (!gameID) {
  console.log("No saved Game ID.");
} else if (username && await networkManager.joinGame(username, gameID)) {
  console.log("Rejoining game with ID: ", gameID);
  networkManager.subscribeToGame(gameID, username);
} else {
  gameManager.resetGameID();
  console.warn("Failed to rejoin game with ID: ", gameID);

}


/* -------------------------------------------------------------------------- */
/*                                 REACTIVITY                                 */
/* -------------------------------------------------------------------------- */

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

document.getElementById("create-game-button")?.addEventListener("click", () => {
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
document.getElementById("place-button")?.addEventListener("click", () => {
  const x: string = (document.getElementById("debug-x") as HTMLInputElement)
    .value;
  const y: string = (document.getElementById("debug-y") as HTMLInputElement)
    .value;

  try {
    networkManager.placeWorker(parseInt(x), parseInt(y));
  } catch (e) {
    console.warn("Invalid input. Please enter a number.");
    console.error(e);
  }
});

document.getElementById("move-worker")?.addEventListener("click", () => {
  const xFrom: string = (
    document.getElementById("debug-from-x") as HTMLInputElement
  ).value;
  const yFrom: string = (
    document.getElementById("debug-from-y") as HTMLInputElement
  ).value;
  const xTo: string = (
    document.getElementById("debug-to-x") as HTMLInputElement
  ).value;
  const yTo: string = (
    document.getElementById("debug-to-y") as HTMLInputElement
  ).value;

  try {
    networkManager.moveWorker(
      parseInt(xFrom),
      parseInt(yFrom),
      parseInt(xTo),
      parseInt(yTo),
    );
  } catch (e) {
    console.log(e);
  }
});

document.getElementById("build-block")?.addEventListener("click", () => {
  const x: string = (document.getElementById("debug-x") as HTMLInputElement)
    .value;
  const y: string = (document.getElementById("debug-y") as HTMLInputElement)
    .value;
  const type: string = (
    document.getElementById("block-type") as HTMLSelectElement
  ).value;

  try {
    networkManager.buildBlock(parseInt(x), parseInt(y), type);
  } catch (e) {
    console.log(e);
  }
});

// #endregion
