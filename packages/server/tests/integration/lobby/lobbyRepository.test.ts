import { GameRuleError } from "@santorini/engine";

import { db } from "@/database.ts";
import { GameRepositoryDb } from "@/game/infra/GameRepositoryDb.ts";
import { LobbyRepository } from "@/lobby/LobbyRepository.ts";
import { generateTestUser } from "@tests/integration/helper/helpers.ts";
import { cleanupTestData } from "@tests/integration/helper/testDb.ts";

const lobbies = new LobbyRepository();
const games = new GameRepositoryDb();

afterEach(cleanupTestData);

afterAll(async () => {
  await db.destroy();
});

describe("Saving and loading a lobby", () => {
  async function newUsers(count: number) {
    return Promise.all(Array.from({ length: count }, async () => (await generateTestUser()).user));
  }

  const usersOf = (lobby: { players: readonly { userId: number }[] }) => lobby.players.map((player) => player.userId);

  test("a created lobby has its creator in the first seat", async () => {
    const [creator] = await newUsers(1);

    const created = await lobbies.create(creator.id, 3);

    const loaded = await lobbies.findById(created.id);
    expect(loaded).toMatchObject({ creatorId: creator.id, maxPlayers: 3 });
    expect(usersOf(loaded!)).toEqual([creator.id]);
  });

  test("keeps the players in the order they joined", async () => {
    const [creator, second, third] = await newUsers(3);
    const { id } = await lobbies.create(creator.id, 3);

    await lobbies.update(id, (lobby) => lobby.join(third.id));
    await lobbies.update(id, (lobby) => lobby.join(second.id));

    expect(usersOf((await lobbies.findById(id))!)).toEqual([creator.id, third.id, second.id]);
  });

  test("closes the gap in the stored seats when a player leaves", async () => {
    const [creator, second, third] = await newUsers(3);
    const { id } = await lobbies.create(creator.id, 3);
    await lobbies.update(id, (lobby) => lobby.join(second.id));
    await lobbies.update(id, (lobby) => lobby.join(third.id));

    await lobbies.update(id, (lobby) => lobby.leave(creator.id));

    expect(usersOf((await lobbies.findById(id))!)).toEqual([second.id, third.id]);
    const seats = await db
      .selectFrom("lobby_players")
      .where("lobby_id", "=", id)
      .select("seat")
      .orderBy("seat")
      .execute();
    expect(seats.map(({ seat }) => seat)).toEqual([0, 1]);
  });

  test("keeps who is ready", async () => {
    const [creator, second] = await newUsers(2);
    const { id } = await lobbies.create(creator.id, 2);
    await lobbies.update(id, (lobby) => lobby.join(second.id));

    await lobbies.update(id, (lobby) => lobby.setReady(second.id, true));

    expect((await lobbies.findById(id))!.players.map((player) => player.isReady)).toEqual([false, true]);
  });

  test("saves nothing when the change is refused", async () => {
    const [creator, second] = await newUsers(2);
    const { id } = await lobbies.create(creator.id, 2);

    await expect(
      lobbies.update(id, (lobby) => {
        lobby.join(second.id);
        lobby.join(second.id);
      }),
    ).rejects.toBeInstanceOf(GameRuleError);

    expect(usersOf((await lobbies.findById(id))!)).toEqual([creator.id]);
  });

  test("answers null for a lobby that does not exist", async () => {
    expect(await lobbies.findById(999)).toBeNull();
    expect(await lobbies.update(999, () => undefined)).toBeNull();
    expect(await lobbies.start(999)).toBeNull();
  });
});

describe("Starting a lobby", () => {
  async function fullLobby(readies: boolean) {
    const creator = (await generateTestUser()).user;
    const guest = (await generateTestUser()).user;
    const { id } = await lobbies.create(creator.id, 2);
    await lobbies.update(id, (lobby) => lobby.join(guest.id));
    if (readies) {
      await lobbies.update(id, (lobby) => lobby.setReady(creator.id, true));
      await lobbies.update(id, (lobby) => lobby.setReady(guest.id, true));
    }
    return { id, creator, guest };
  }

  test("refuses to start a lobby whose players are not all ready, and keeps the lobby", async () => {
    const { id } = await fullLobby(false);

    await expect(lobbies.start(id)).rejects.toBeInstanceOf(GameRuleError);

    expect(await lobbies.findById(id)).not.toBeNull();
    expect(await games.findByStatus("in-progress")).toHaveLength(0);
  });

  test("creates a game that is already in progress with the players in their seats, and removes the lobby", async () => {
    const { id, creator, guest } = await fullLobby(true);

    const game = await lobbies.start(id);

    expect(game).toMatchObject({ status: "in-progress", phase: "placing", currentSeat: 0, creatorId: creator.id });
    expect(game!.players.map((player) => player.userId)).toEqual([creator.id, guest.id]);
    expect(await lobbies.findById(id)).toBeNull();
    const [stored] = await games.findByStatus("in-progress");
    expect(stored.game.id).toBe(game!.id);
    expect(stored.game.players.map((player) => player.userId)).toEqual([creator.id, guest.id]);
    expect(stored.metadata.startedAt).toBeInstanceOf(Date);
  });

  test("starts exactly one game when two starts arrive together", async () => {
    const { id } = await fullLobby(true);

    const results = await Promise.all([lobbies.start(id), lobbies.start(id)]);

    expect(results.filter((game) => game !== null)).toHaveLength(1);
    expect(await games.findByStatus("in-progress")).toHaveLength(1);
  });
});
