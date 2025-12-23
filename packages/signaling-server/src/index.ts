type Server<T> = {
  upgrade(req: Request, options: { data: T }): boolean;
};

type ServerWebSocket<T> = {
  data: T;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, data: string): void;
  send(data: string): void;
  close(code?: number): void;
};

declare const Bun: {
  serve: <T>(options: {
    hostname?: string;
    port?: number;
    fetch(req: Request, server: Server<T>): Response | void | undefined;
    websocket: {
      open(ws: ServerWebSocket<T>): void;
      message(
        ws: ServerWebSocket<T>,
        message: string | ArrayBuffer | Uint8Array
      ): void;
      close(ws: ServerWebSocket<T>): void;
    };
  }) => { port: number };
};

type ClientMeta = {
  peerId: string;
  room?: string | null;
  isHost?: boolean;
  waitingRoom?: boolean;
  admitted?: boolean;
};

type SignalPayload = {
  type: "signal";
  to: string;
  data: unknown;
};

type BroadcastPayload = {
  type: "broadcast";
  data: unknown;
};

type ControlPayload = {
  type: "control";
  action: string;
  data?: unknown;
};

type IncomingMessage = SignalPayload | BroadcastPayload | ControlPayload;

type OutgoingMessage =
  | { type: "signal"; from: string; data: unknown }
  | { type: "broadcast"; from: string; room?: string | null; data: unknown }
  | PresenceMessage
  | {
      type: "control";
      from: string;
      room?: string | null;
      action: string;
      data?: unknown;
    }
  | { type: "error"; message: string };

type PresenceMessage = {
  type: "presence";
  room?: string | null;
  peerId: string;
  peers: string[];
  action: "join" | "leave";
};

function parseMessage(raw: string): IncomingMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (parsed.type === "signal" ||
        parsed.type === "broadcast" ||
        parsed.type === "control")
    )
      return parsed;
    return null;
  } catch (error) {
    console.error("Failed to parse message", error);
    return null;
  }
}

const HOST = "0.0.0.0";
const PORT = 8787;

const roomMembers = new Map<string, Set<string>>();
const waitingRooms = new Map<string, Set<string>>();
const clients = new Map<string, ServerWebSocket<ClientMeta>>();

function getHosts(room?: string | null) {
  if (!room) return [] as ServerWebSocket<ClientMeta>[];
  const hosts: ServerWebSocket<ClientMeta>[] = [];
  for (const ws of clients.values()) {
    if (ws.data.room === room && ws.data.isHost) hosts.push(ws);
  }
  return hosts;
}

function sendControl(
  target: ServerWebSocket<ClientMeta>,
  payload: {
    action: string;
    data?: unknown;
    room?: string | null;
    from?: string;
  }
) {
  const message: OutgoingMessage = {
    type: "control",
    from: payload.from ?? "server",
    room: payload.room,
    action: payload.action,
    data: payload.data,
  };
  target.send(JSON.stringify(message));
}

function broadcastToHosts(
  room: string | null | undefined,
  payload: { action: string; data?: unknown }
) {
  getHosts(room).forEach((hostWs) =>
    sendControl(hostWs, { action: payload.action, data: payload.data, room })
  );
}

// Signaling server with simple room presence
const liveServer = Bun.serve<ClientMeta>({
  hostname: HOST,
  port: PORT,
  fetch(req: Request, bunServer: Server<ClientMeta>) {
    const url = new URL(req.url);
    const peerId = url.searchParams.get("peerId");
    const room = url.searchParams.get("room");
    const isHost = url.searchParams.get("host") === "1";
    const waitingRoom = url.searchParams.get("waitingRoom") === "1";

    if (!peerId) {
      return new Response("peerId query param is required", { status: 400 });
    }

    const upgraded = bunServer.upgrade(req, {
      data: {
        peerId,
        room,
        isHost,
        waitingRoom,
        admitted: isHost ? true : !waitingRoom,
      },
    });
    if (!upgraded) {
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    return undefined;
  },
  websocket: {
    open(ws: ServerWebSocket<ClientMeta>) {
      const { peerId, room } = ws.data;
      clients.set(peerId, ws);
      ws.subscribe(`peer:${peerId}`);
      if (room) {
        if (ws.data.waitingRoom && !ws.data.isHost) {
          const waiters = waitingRooms.get(room) ?? new Set<string>();
          waiters.add(peerId);
          waitingRooms.set(room, waiters);
          broadcastToHosts(room, {
            action: "waiting-list",
            data: { waiting: Array.from(waiters) },
          });
          sendControl(ws, {
            action: "waiting",
            room,
            data: { position: waiters.size },
          });
          return;
        }

        ws.data.admitted = true;
        ws.subscribe(`room:${room}`);
        const set = roomMembers.get(room) ?? new Set<string>();
        set.add(peerId);
        roomMembers.set(room, set);
        const presence: PresenceMessage = {
          type: "presence",
          room,
          peerId,
          peers: Array.from(set),
          action: "join",
        };
        ws.publish(`room:${room}`, JSON.stringify(presence));
        ws.send(JSON.stringify(presence));

        // send waiting list snapshot to host
        const pending = waitingRooms.get(room);
        if (ws.data.isHost && pending && pending.size) {
          sendControl(ws, {
            action: "waiting-list",
            room,
            data: { waiting: Array.from(pending) },
          });
        }
      }
    },
    message(
      ws: ServerWebSocket<ClientMeta>,
      raw: string | ArrayBuffer | Uint8Array
    ) {
      const payload = typeof raw === "string" ? raw : raw.toString();
      const parsed = parseMessage(payload);
      if (!parsed) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message payload",
          } satisfies OutgoingMessage)
        );
        return;
      }

      if (parsed.type === "signal") {
        const outgoing: OutgoingMessage = {
          type: "signal",
          from: ws.data.peerId,
          data: parsed.data,
        };
        ws.publish(`peer:${parsed.to}`, JSON.stringify(outgoing));
        return;
      }

      if (parsed.type === "broadcast") {
        const outgoing: OutgoingMessage = {
          type: "broadcast",
          from: ws.data.peerId,
          room: ws.data.room,
          data: parsed.data,
        };
        if (ws.data.room) {
          ws.publish(`room:${ws.data.room}`, JSON.stringify(outgoing));
        }
        return;
      }

      if (parsed.type === "control") {
        const room = ws.data.room;
        if (parsed.action === "admit" && ws.data.isHost && room) {
          const targetId = (parsed.data as any)?.peerId as string | undefined;
          if (!targetId) return;
          const waiters = waitingRooms.get(room);
          const targetWs = targetId ? clients.get(targetId) : undefined;
          if (waiters && waiters.has(targetId) && targetWs) {
            waiters.delete(targetId);
            waitingRooms.set(room, waiters);
            targetWs.data.admitted = true;
            targetWs.subscribe(`room:${room}`);
            const set = roomMembers.get(room) ?? new Set<string>();
            set.add(targetId);
            roomMembers.set(room, set);
            const presence: PresenceMessage = {
              type: "presence",
              room,
              peerId: targetId,
              peers: Array.from(set),
              action: "join",
            };
            targetWs.publish(`room:${room}`, JSON.stringify(presence));
            targetWs.send(JSON.stringify(presence));
            broadcastToHosts(room, {
              action: "waiting-list",
              data: { waiting: Array.from(waiters) },
            });
            sendControl(targetWs, {
              action: "admitted",
              room,
              from: ws.data.peerId,
            });
          }
          return;
        }

        if (parsed.action === "reject" && ws.data.isHost && room) {
          const targetId = (parsed.data as any)?.peerId as string | undefined;
          if (!targetId) return;
          const waiters = waitingRooms.get(room);
          const targetWs = targetId ? clients.get(targetId) : undefined;
          if (waiters && waiters.has(targetId) && targetWs) {
            waiters.delete(targetId);
            waitingRooms.set(room, waiters);
            sendControl(targetWs, {
              action: "rejected",
              room,
              from: ws.data.peerId,
            });
            targetWs.close();
            broadcastToHosts(room, {
              action: "waiting-list",
              data: { waiting: Array.from(waiters) },
            });
          }
          return;
        }

        if (parsed.action === "raise-hand" && room) {
          broadcastToHosts(room, {
            action: "raise-hand",
            data: { peerId: ws.data.peerId },
          });
          return;
        }

        if (parsed.action === "hand-lowered" && room) {
          broadcastToHosts(room, {
            action: "hand-lowered",
            data: { peerId: ws.data.peerId },
          });
          return;
        }
      }
    },
    close(ws: ServerWebSocket<ClientMeta>) {
      const { peerId, room } = ws.data;
      ws.unsubscribe(`peer:${peerId}`);
      clients.delete(peerId);
      if (room) {
        const waiters = waitingRooms.get(room);
        if (waiters && waiters.delete(peerId)) {
          waitingRooms.set(room, waiters);
          broadcastToHosts(room, {
            action: "waiting-list",
            data: { waiting: Array.from(waiters) },
          });
          return;
        }
        ws.unsubscribe(`room:${room}`);
        const set = roomMembers.get(room);
        if (set) {
          set.delete(peerId);
          if (set.size === 0) {
            roomMembers.delete(room);
          } else {
            roomMembers.set(room, set);
          }
          const presence: PresenceMessage = {
            type: "presence",
            room,
            peerId,
            peers: Array.from(set),
            action: "leave",
          };
          ws.publish(`room:${room}`, JSON.stringify(presence));
        }
      }
    },
  },
});

console.log(`Signaling server running on ws://localhost:${liveServer.port}`);
console.log(
  `LAN access (if allowed by firewall): ws://<your-lan-ip>:${liveServer.port}`
);
