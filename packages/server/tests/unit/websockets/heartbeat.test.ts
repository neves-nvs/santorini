import { EventEmitter } from "node:events";

import type WebSocket from "ws";

import { monitorHeartbeat } from "@/websockets/heartbeat.ts";

function socket() {
  return Object.assign(new EventEmitter(), {
    ping: vi.fn(),
    terminate: vi.fn(),
  });
}

describe("server heartbeat", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("terminates a silently dead socket and stops monitoring after it closes", () => {
    const ws = socket();
    monitorHeartbeat(ws as unknown as WebSocket);
    vi.advanceTimersByTime(30_000);
    expect(ws.ping).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(30_000);
    expect(ws.terminate).toHaveBeenCalledOnce();
    ws.emit("close");
    vi.advanceTimersByTime(60_000);
    expect(ws.terminate).toHaveBeenCalledOnce();
  });

  it("keeps a socket which answers pings alive", () => {
    const ws = socket();
    monitorHeartbeat(ws as unknown as WebSocket);
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(30_000);
      ws.emit("pong");
    }
    expect(ws.ping).toHaveBeenCalledTimes(4);
    expect(ws.terminate).not.toHaveBeenCalled();
    ws.emit("close");
    expect(vi.getTimerCount()).toBe(0);
  });
});
