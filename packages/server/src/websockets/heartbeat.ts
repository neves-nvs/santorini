import type WebSocket from "ws";

const HEARTBEAT_INTERVAL = 30_000;

export function monitorHeartbeat(socket: WebSocket): void {
  let alive = true;
  const onPong = () => {
    alive = true;
  };
  socket.on("pong", onPong);
  const interval = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
  }, HEARTBEAT_INTERVAL);
  interval.unref();
  socket.once("close", () => {
    clearInterval(interval);
    socket.off("pong", onPong);
  });
}
