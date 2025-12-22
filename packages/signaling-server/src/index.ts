type Server<T> = {
  upgrade(req: Request, options: { data: T }): boolean;
};

type ServerWebSocket<T> = {
  data: T;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, data: string): void;
  send(data: string): void;
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

type ClientMeta = { peerId: string; room?: string | null };

type SignalPayload = {
  type: "signal";
  to: string;
  data: unknown;
};

type BroadcastPayload = {
  type: "broadcast";
  data: unknown;
};

type IncomingMessage = SignalPayload | BroadcastPayload;

type OutgoingMessage =
  | { type: "signal"; from: string; data: unknown }
  | { type: "broadcast"; from: string; room?: string | null; data: unknown }
  | { type: "error"; message: string };

function parseMessage(raw: string): IncomingMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === "signal" || parsed.type === "broadcast"))
      return parsed;
    return null;
  } catch (error) {
    console.error("Failed to parse message", error);
    return null;
  }
}

const HOST = "0.0.0.0";
const PORT = 8787;

const server = Bun.serve<ClientMeta>({
  hostname: HOST,
  port: PORT,
  fetch(req: Request, bunServer: Server<ClientMeta>) {
    const url = new URL(req.url);
    const peerId = url.searchParams.get("peerId");
    const room = url.searchParams.get("room");

    if (!peerId) {
      return new Response("peerId query param is required", { status: 400 });
    }

    const upgraded = bunServer.upgrade(req, { data: { peerId, room } });
    if (!upgraded) {
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    return undefined;
  },
  websocket: {
    open(ws: ServerWebSocket<ClientMeta>) {
      const { peerId, room } = ws.data;
      ws.subscribe(`peer:${peerId}`);
      if (room) ws.subscribe(`room:${room}`);
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
    },
    close(ws: ServerWebSocket<ClientMeta>) {
      const { peerId, room } = ws.data;
      ws.unsubscribe(`peer:${peerId}`);
      if (room) ws.unsubscribe(`room:${room}`);
    },
  },
});

console.log(`Signaling server running on ws://localhost:${server.port}`);
console.log(
  `LAN access (if allowed by firewall): ws://<your-lan-ip>:${server.port}`
);
