import { randomBytes } from "crypto";

const TICKET_LIFETIME_MS = 30_000;

interface Ticket {
  username: string;
  expiresAt: number;
}

export class WebSocketTickets {
  private tickets = new Map<string, Ticket>();

  constructor(
    private lifetimeMs = TICKET_LIFETIME_MS,
    private now: () => number = Date.now,
  ) {}

  issue(username: string): string {
    this.removeExpired();
    const ticket = randomBytes(32).toString("base64url");
    this.tickets.set(ticket, { username, expiresAt: this.now() + this.lifetimeMs });
    return ticket;
  }

  consume(ticket: string): string | null {
    const found = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    return found && found.expiresAt > this.now() ? found.username : null;
  }

  private removeExpired(): void {
    for (const [ticket, { expiresAt }] of this.tickets) {
      if (expiresAt <= this.now()) {
        this.tickets.delete(ticket);
      }
    }
  }
}

export const webSocketTickets = new WebSocketTickets();
