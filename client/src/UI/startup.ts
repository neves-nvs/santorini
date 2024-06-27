import { main } from "../Main";

const gameManager = main.getGameManager();
const networkManager = main.getNetworkManager();

/* -------------------------------------------------------------------------- */
/*                                    GAME                                    */
/* -------------------------------------------------------------------------- */
document.getElementById("join-button")?.addEventListener("click", () => {
  const playerName = (
    document.getElementById("player-name") as HTMLInputElement
  )?.value;

  if (!playerName) {
    return;
  }

  try {
    networkManager.createUser(playerName);
  } catch (e: any) {
    console.error(e);
    alert(e.message);
    return;
  }

  gameManager.setUsername(playerName);
  console.log("Username set to:", gameManager.getUsername());
});

document.getElementById("login-button")?.addEventListener("click", () => {
  const playerName = (
    document.getElementById("player-name") as HTMLInputElement
  )?.value;

  if (!playerName) {
    return;
  }

  try {
    networkManager.login(playerName);
  } catch (e: any) {
    console.error(e);
    alert(e.message);
    return;
  }

  gameManager.setUsername(playerName);
  console.log("Username set to:", gameManager.getUsername());
});

document
  .getElementById("refresh-games-button")
  ?.addEventListener("click", async () => {
    try {
      const games = await networkManager.getGames();
      const gamesList = document.getElementById("games") as HTMLUListElement;
      gamesList.innerHTML = "";
      console.log(games);

      games.forEach((id: string) => {
        const listItem = document.createElement("li");
        listItem.textContent = `Game ID: ${id}`;
        listItem.addEventListener("click", () => {
          const username = gameManager.getUsername();
          if (!username) {
            console.error("Username not set.");
            alert("Please enter your name and select a color.");
            return;
          }
          networkManager.joinGame(username, id); // Replace 'YourUsername' with the actual username
        });
        gamesList.appendChild(listItem);
      });
    } catch (e) {
      console.error("Failed to fetch games:", e);
    }
  });

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

/* -------------------------------------------------------------------------- */
/*                                     UI                                     */
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
