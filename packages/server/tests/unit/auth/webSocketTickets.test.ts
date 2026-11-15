import { WebSocketTickets } from "../../../src/auth/webSocketTickets.ts";

describe("WebSocketTickets", () => {
  let now: number;
  let tickets: WebSocketTickets;

  beforeEach(() => {
    now = 1_000;
    tickets = new WebSocketTickets(30_000, () => now);
  });

  it("gives the username back for a ticket it issued", () => {
    const ticket = tickets.issue("alice");

    expect(tickets.consume(ticket)).toBe("alice");
  });

  it("accepts a ticket only once", () => {
    const ticket = tickets.issue("alice");
    tickets.consume(ticket);

    expect(tickets.consume(ticket)).toBeNull();
  });

  it("rejects a ticket it did not issue", () => {
    expect(tickets.consume("made-up")).toBeNull();
  });

  it("rejects an expired ticket", () => {
    const ticket = tickets.issue("alice");
    now += 30_000;

    expect(tickets.consume(ticket)).toBeNull();
  });

  it("accepts a ticket just before it expires", () => {
    const ticket = tickets.issue("alice");
    now += 29_999;

    expect(tickets.consume(ticket)).toBe("alice");
  });

  it("issues a different ticket every time", () => {
    expect(tickets.issue("alice")).not.toBe(tickets.issue("alice"));
  });
});
