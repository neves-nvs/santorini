export function updatePlayersList(payload: any) {
  const players: string[] = payload.players;
  document.getElementById("players")!.innerHTML = "";
  players.forEach((player: string) => {
    const li = document.createElement("li");
    li.textContent = player;
    document.getElementById("players")?.appendChild(li);
  });
}

export function updatePlaysList(payload: any) {
  console.log("updatePlaysList", payload);
  const plays: string[] = payload.plays;
  document.getElementById("plays")!.innerHTML = "";
  plays.forEach((play: string) => {
    const li = document.createElement("li");
    li.textContent = play;
    document.getElementById("plays")?.appendChild(li);
  });
}