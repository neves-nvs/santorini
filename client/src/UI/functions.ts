export function updatePlayersList(payload: any) {
  const players: string[] = payload.players;
  document.getElementById("players")!.innerHTML = "";
  players.forEach((player: string) => {
    const li = document.createElement("li");
    li.textContent = player;
    document.getElementById("players")?.appendChild(li);
  });
}
