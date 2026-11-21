import { asUserId, GameRuleError } from "@santorini/engine";

import { Lobby } from "@/lobby/Lobby.ts";

const CREATOR = asUserId(100);
const GUEST = asUserId(101);
const THIRD = asUserId(102);

function lobbyWith(maxPlayers: number, ...users: ReturnType<typeof asUserId>[]): Lobby {
  const lobby = new Lobby(1, CREATOR, maxPlayers, []);
  users.forEach((user) => lobby.join(user));
  return lobby;
}

const usersOf = (lobby: Lobby) => lobby.players.map((player) => player.userId);

describe("Lobby joining and leaving", () => {
  it("seats players in the order they join", () => {
    const lobby = lobbyWith(3, GUEST, CREATOR, THIRD);

    expect(usersOf(lobby)).toEqual([GUEST, CREATOR, THIRD]);
  });

  it("refuses a join when every seat is taken", () => {
    const lobby = lobbyWith(2, CREATOR, GUEST);

    expect(() => lobby.join(THIRD)).toThrow(expect.objectContaining({ code: "game_full" }));
  });

  it("refuses the same user twice", () => {
    const lobby = lobbyWith(2, CREATOR);

    expect(() => lobby.join(CREATOR)).toThrow(GameRuleError);
    expect(usersOf(lobby)).toEqual([CREATOR]);
  });

  it("closes the gap when a player leaves, so the seats after them move down", () => {
    const lobby = lobbyWith(3, CREATOR, GUEST, THIRD);

    lobby.leave(CREATOR);

    expect(usersOf(lobby)).toEqual([GUEST, THIRD]);
  });

  it("refuses a user who is not in the lobby", () => {
    const lobby = lobbyWith(2, CREATOR);

    expect(() => lobby.leave(GUEST)).toThrow(expect.objectContaining({ code: "not_in_game" }));
    expect(() => lobby.setReady(GUEST, false)).toThrow(expect.objectContaining({ code: "not_in_game" }));
  });
});

describe("Lobby readiness", () => {
  it("refuses to ready up while a seat is still free", () => {
    const lobby = lobbyWith(2, CREATOR);

    expect(() => lobby.setReady(CREATOR, true)).toThrow(GameRuleError);
    expect(lobby.players[0].isReady).toBe(false);
  });

  it("lets a player ready up once every seat is taken", () => {
    const lobby = lobbyWith(2, CREATOR, GUEST);

    lobby.setReady(GUEST, true);

    expect(lobby.players.map((player) => player.isReady)).toEqual([false, true]);
  });

  it("lets a player take their ready back at any time", () => {
    const lobby = lobbyWith(2, CREATOR, GUEST);
    lobby.setReady(CREATOR, true);

    lobby.setReady(CREATOR, false);

    expect(lobby.players[0].isReady).toBe(false);
  });

  it("clears every ready when someone leaves, because the seats are no longer the ones they agreed to", () => {
    const lobby = lobbyWith(3, CREATOR, GUEST, THIRD);
    lobby.setReady(CREATOR, true);
    lobby.setReady(GUEST, true);

    lobby.leave(THIRD);

    expect(lobby.players.map((player) => player.isReady)).toEqual([false, false]);
  });
});

describe("Lobby start", () => {
  it("refuses to start while a seat is free", () => {
    const lobby = lobbyWith(2, CREATOR);

    expect(() => lobby.start()).toThrow(GameRuleError);
  });

  it("refuses to start until everyone is ready", () => {
    const lobby = lobbyWith(2, CREATOR, GUEST);
    lobby.setReady(CREATOR, true);

    expect(() => lobby.start()).toThrow(GameRuleError);
  });

  it("hands over the players in seat order once everyone is ready", () => {
    const lobby = lobbyWith(2, GUEST, CREATOR);
    lobby.setReady(GUEST, true);
    lobby.setReady(CREATOR, true);

    expect(lobby.start()).toEqual({ creatorId: CREATOR, players: [GUEST, CREATOR] });
  });
});
