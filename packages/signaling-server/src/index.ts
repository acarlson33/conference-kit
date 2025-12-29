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

type TLSOptions = {
  key?: string;
  cert?: string;
};

type ServeOptions<T> = {
  hostname?: string;
  port?: number;
  tls?: TLSOptions;
  fetch(req: Request, server: Server<T>): Response | void | undefined;
  websocket: {
    open(ws: ServerWebSocket<T>): void;
    message(
      ws: ServerWebSocket<T>,
      message: string | ArrayBuffer | Uint8Array
    ): void;
    close(ws: ServerWebSocket<T>): void;
  };
};

declare const Bun: {
  serve: <T>(options: ServeOptions<T>) => { port: number };
  file: (path: string) => { text(): Promise<string> };
  env: Record<string, string | undefined>;
};

type ClientMeta = {
  peerId: string;
  displayName?: string;
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
  displayName?: string;
  peers: string[];
  peerDisplayNames?: Record<string, string>;
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
    console.warn("[PARSE] Invalid message type:", parsed?.type);
    return null;
  } catch (error) {
    console.error(
      "[PARSE] Failed to parse message:",
      error,
      "Raw:",
      raw.slice(0, 200)
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging utilities
// ─────────────────────────────────────────────────────────────────────────────
const LOG_COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

function timestamp() {
  return new Date().toISOString();
}

function logConnect(
  peerId: string,
  room: string | null | undefined,
  isHost: boolean,
  waitingRoom: boolean
) {
  console.log(
    `${LOG_COLORS.green}[${timestamp()}] ➜ CONNECT${LOG_COLORS.reset}`,
    `peerId=${LOG_COLORS.cyan}${peerId}${LOG_COLORS.reset}`,
    `room=${LOG_COLORS.yellow}${room ?? "(none)"}${LOG_COLORS.reset}`,
    `isHost=${isHost}`,
    `waitingRoom=${waitingRoom}`
  );
}

function logDisconnect(peerId: string, room: string | null | undefined) {
  console.log(
    `${LOG_COLORS.red}[${timestamp()}] ✖ DISCONNECT${LOG_COLORS.reset}`,
    `peerId=${LOG_COLORS.cyan}${peerId}${LOG_COLORS.reset}`,
    `room=${LOG_COLORS.yellow}${room ?? "(none)"}${LOG_COLORS.reset}`
  );
}

function logMessage(
  direction: "IN" | "OUT",
  peerId: string,
  type: string,
  details: Record<string, unknown>
) {
  const arrow = direction === "IN" ? "◀" : "▶";
  const color = direction === "IN" ? LOG_COLORS.blue : LOG_COLORS.magenta;
  console.log(
    `${color}[${timestamp()}] ${arrow} ${direction}${LOG_COLORS.reset}`,
    `peerId=${LOG_COLORS.cyan}${peerId}${LOG_COLORS.reset}`,
    `type=${LOG_COLORS.yellow}${type}${LOG_COLORS.reset}`,
    JSON.stringify(details)
  );
}

function logPresence(
  action: "join" | "leave",
  peerId: string,
  room: string,
  totalPeers: number
) {
  const icon = action === "join" ? "+" : "-";
  const color = action === "join" ? LOG_COLORS.green : LOG_COLORS.red;
  console.log(
    `${color}[${timestamp()}] ${icon} PRESENCE ${action.toUpperCase()}${
      LOG_COLORS.reset
    }`,
    `peerId=${LOG_COLORS.cyan}${peerId}${LOG_COLORS.reset}`,
    `room=${LOG_COLORS.yellow}${room}${LOG_COLORS.reset}`,
    `totalPeers=${totalPeers}`
  );
}

function logWaitingRoom(
  action: string,
  peerId: string,
  room: string,
  waitingCount: number
) {
  console.log(
    `${LOG_COLORS.yellow}[${timestamp()}] ⏳ WAITING ${action.toUpperCase()}${
      LOG_COLORS.reset
    }`,
    `peerId=${LOG_COLORS.cyan}${peerId}${LOG_COLORS.reset}`,
    `room=${LOG_COLORS.yellow}${room}${LOG_COLORS.reset}`,
    `waitingCount=${waitingCount}`
  );
}

function logControl(
  from: string,
  action: string,
  target?: string,
  room?: string | null
) {
  console.log(
    `${LOG_COLORS.magenta}[${timestamp()}] ⚙ CONTROL${LOG_COLORS.reset}`,
    `from=${LOG_COLORS.cyan}${from}${LOG_COLORS.reset}`,
    `action=${LOG_COLORS.yellow}${action}${LOG_COLORS.reset}`,
    target ? `target=${target}` : "",
    room ? `room=${room}` : ""
  );
}

function logSignal(from: string, to: string, signalType?: string) {
  console.log(
    `${LOG_COLORS.blue}[${timestamp()}] ⚡ SIGNAL${LOG_COLORS.reset}`,
    `from=${LOG_COLORS.cyan}${from}${LOG_COLORS.reset}`,
    `to=${LOG_COLORS.cyan}${to}${LOG_COLORS.reset}`,
    signalType ? `signalType=${signalType}` : ""
  );
}

function logBroadcast(from: string, room: string | null | undefined) {
  console.log(
    `${LOG_COLORS.yellow}[${timestamp()}] 📢 BROADCAST${LOG_COLORS.reset}`,
    `from=${LOG_COLORS.cyan}${from}${LOG_COLORS.reset}`,
    `room=${LOG_COLORS.yellow}${room ?? "(none)"}${LOG_COLORS.reset}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (environment variables)
// ─────────────────────────────────────────────────────────────────────────────
const HOST = Bun.env.HOST ?? "0.0.0.0";
const PORT = parseInt(Bun.env.PORT ?? "8787", 10);

// TLS configuration for WSS support
// Set these environment variables to enable HTTPS/WSS:
//   SSL_CERT_PATH - path to certificate file (e.g., fullchain.pem)
//   SSL_KEY_PATH  - path to private key file (e.g., privkey.pem)
const SSL_CERT_PATH = Bun.env.SSL_CERT_PATH;
const SSL_KEY_PATH = Bun.env.SSL_KEY_PATH;

const roomMembers = new Map<string, Set<string>>();
const waitingRooms = new Map<string, Set<string>>();
const clients = new Map<string, ServerWebSocket<ClientMeta>>();

function logState() {
  console.log(
    `${LOG_COLORS.dim}[${timestamp()}] 📊 STATE${LOG_COLORS.reset}`,
    `clients=${clients.size}`,
    `rooms=${roomMembers.size}`,
    `waitingRooms=${waitingRooms.size}`
  );
  if (roomMembers.size > 0) {
    roomMembers.forEach((members, room) => {
      console.log(
        `  ${LOG_COLORS.dim}room=${room}: [${Array.from(members).join(", ")}]${
          LOG_COLORS.reset
        }`
      );
    });
  }
  if (waitingRooms.size > 0) {
    waitingRooms.forEach((waiters, room) => {
      console.log(
        `  ${LOG_COLORS.dim}waiting=${room}: [${Array.from(waiters).join(
          ", "
        )}]${LOG_COLORS.reset}`
      );
    });
  }
}

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
  logMessage("OUT", target.data.peerId, `control:${payload.action}`, {
    room: payload.room,
    data: payload.data,
  });
  target.send(JSON.stringify(message));
}

function broadcastToHosts(
  room: string | null | undefined,
  payload: { action: string; data?: unknown }
) {
  const hosts = getHosts(room);
  console.log(
    `${LOG_COLORS.dim}[${timestamp()}] Broadcasting to ${
      hosts.length
    } host(s) in room ${room}: ${payload.action}${LOG_COLORS.reset}`
  );
  hosts.forEach((hostWs) =>
    sendControl(hostWs, { action: payload.action, data: payload.data, room })
  );
}

// Build TLS config if certificates are provided
async function getTlsConfig(): Promise<TLSOptions | undefined> {
  if (!SSL_CERT_PATH || !SSL_KEY_PATH) {
    return undefined;
  }
  try {
    const [cert, key] = await Promise.all([
      Bun.file(SSL_CERT_PATH).text(),
      Bun.file(SSL_KEY_PATH).text(),
    ]);
    console.log(
      `${
        LOG_COLORS.green
      }[${timestamp()}] TLS certificates loaded successfully${LOG_COLORS.reset}`
    );
    return { cert, key };
  } catch (error) {
    console.error(
      `${LOG_COLORS.red}[${timestamp()}] Failed to load TLS certificates:${
        LOG_COLORS.reset
      }`,
      error
    );
    console.warn(
      `${LOG_COLORS.yellow}[${timestamp()}] Falling back to non-TLS mode${
        LOG_COLORS.reset
      }`
    );
    return undefined;
  }
}

// WebSocket handlers
function handleOpen(ws: ServerWebSocket<ClientMeta>) {
  const { peerId, room, isHost, waitingRoom } = ws.data;

  logConnect(peerId, room, isHost ?? false, waitingRoom ?? false);

  // Prevent multiple hosts in the same room (unless it's the same peer reconnecting)
  if (room && isHost) {
    const existingHosts = getHosts(room).filter(
      (hostWs) => hostWs.data.peerId !== peerId
    );
    if (existingHosts.length > 0) {
      sendControl(ws, {
        action: "host-blocked",
        room,
        data: {
          reason: "host-already-present",
          hostId: existingHosts[0].data.peerId,
        },
      });
      ws.send(
        JSON.stringify({
          type: "error",
          message: "A host is already present in this room",
        } satisfies OutgoingMessage)
      );
      ws.close(4001);
      return;
    }
  }

  clients.set(peerId, ws);
  ws.subscribe(`peer:${peerId}`);
  console.log(
    `${LOG_COLORS.dim}[${timestamp()}] Subscribed ${peerId} to peer:${peerId}${
      LOG_COLORS.reset
    }`
  );

  if (room) {
    if (ws.data.waitingRoom && !ws.data.isHost) {
      const waiters = waitingRooms.get(room) ?? new Set<string>();
      waiters.add(peerId);
      waitingRooms.set(room, waiters);

      logWaitingRoom("added", peerId, room, waiters.size);

      broadcastToHosts(room, {
        action: "waiting-list",
        data: { waiting: Array.from(waiters) },
      });
      sendControl(ws, {
        action: "waiting",
        room,
        data: { position: waiters.size },
      });
      logState();
      return;
    }

    ws.data.admitted = true;
    ws.subscribe(`room:${room}`);
    console.log(
      `${LOG_COLORS.dim}[${timestamp()}] Subscribed ${peerId} to room:${room}${
        LOG_COLORS.reset
      }`
    );

    const set = roomMembers.get(room) ?? new Set<string>();
    set.add(peerId);
    roomMembers.set(room, set);

    const peerDisplayNames: Record<string, string> = {};
    Array.from(set).forEach((id) => {
      const client = clients.get(id);
      peerDisplayNames[id] =
        client?.data?.displayName || `Guest ${id.toUpperCase()}`;
    });

    const presence: PresenceMessage = {
      type: "presence",
      room,
      peerId,
      displayName: ws.data.displayName,
      peers: Array.from(set),
      peerDisplayNames,
      action: "join",
    };

    logPresence("join", peerId, room, set.size);
    logMessage("OUT", peerId, "presence:join", {
      room,
      peers: Array.from(set),
      displayName: ws.data.displayName,
    });

    ws.publish(`room:${room}`, JSON.stringify(presence));
    ws.send(JSON.stringify(presence));

    // send waiting list snapshot to host
    const pending = waitingRooms.get(room);
    if (ws.data.isHost && pending && pending.size) {
      console.log(
        `${
          LOG_COLORS.dim
        }[${timestamp()}] Sending waiting list snapshot to host ${peerId}: ${
          pending.size
        } waiting${LOG_COLORS.reset}`
      );
      sendControl(ws, {
        action: "waiting-list",
        room,
        data: { waiting: Array.from(pending) },
      });
    }

    logState();
  }
}

function handleMessage(
  ws: ServerWebSocket<ClientMeta>,
  raw: string | ArrayBuffer | Uint8Array
) {
  const payload = typeof raw === "string" ? raw : raw.toString();
  const parsed = parseMessage(payload);

  if (!parsed) {
    console.warn(
      `${LOG_COLORS.red}[${timestamp()}] Invalid message from ${
        ws.data.peerId
      }${LOG_COLORS.reset}`
    );
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Invalid message payload",
      } satisfies OutgoingMessage)
    );
    return;
  }

  // Log incoming message
  logMessage("IN", ws.data.peerId, parsed.type, {
    ...(parsed.type === "signal"
      ? {
          to: (parsed as SignalPayload).to,
          signalType: ((parsed as SignalPayload).data as any)?.type,
        }
      : {}),
    ...(parsed.type === "control"
      ? { action: (parsed as ControlPayload).action }
      : {}),
  });

  if (parsed.type === "signal") {
    const signalData = parsed.data as any;
    const signalType =
      signalData?.type ?? (signalData?.candidate ? "candidate" : "unknown");
    logSignal(ws.data.peerId, parsed.to, signalType);

    const outgoing: OutgoingMessage = {
      type: "signal",
      from: ws.data.peerId,
      data: parsed.data,
    };
    ws.publish(`peer:${parsed.to}`, JSON.stringify(outgoing));
    return;
  }

  if (parsed.type === "broadcast") {
    logBroadcast(ws.data.peerId, ws.data.room);

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
    logControl(
      ws.data.peerId,
      parsed.action,
      (parsed.data as any)?.peerId,
      room
    );

    if (parsed.action === "admit" && ws.data.isHost && room) {
      const targetId = (parsed.data as any)?.peerId as string | undefined;
      if (!targetId) {
        console.warn(
          `${LOG_COLORS.red}[${timestamp()}] Admit failed: no targetId${
            LOG_COLORS.reset
          }`
        );
        return;
      }
      const waiters = waitingRooms.get(room);
      const targetWs = targetId ? clients.get(targetId) : undefined;

      console.log(
        `${
          LOG_COLORS.dim
        }[${timestamp()}] Admit check: targetId=${targetId}, hasWaiters=${!!waiters}, inWaiters=${waiters?.has(
          targetId
        )}, hasTargetWs=${!!targetWs}${LOG_COLORS.reset}`
      );

      if (waiters && waiters.has(targetId) && targetWs) {
        waiters.delete(targetId);
        waitingRooms.set(room, waiters);
        targetWs.data.admitted = true;
        targetWs.subscribe(`room:${room}`);

        const set = roomMembers.get(room) ?? new Set<string>();
        set.add(targetId);
        roomMembers.set(room, set);

        const peerDisplayNames: Record<string, string> = {};
        Array.from(set).forEach((id) => {
          const client = clients.get(id);
          peerDisplayNames[id] =
            client?.data?.displayName || `Guest ${id.toUpperCase()}`;
        });

        const presence: PresenceMessage = {
          type: "presence",
          room,
          peerId: targetId,
          displayName: targetWs.data.displayName,
          peers: Array.from(set),
          peerDisplayNames,
          action: "join",
        };

        logPresence("join", targetId, room, set.size);
        logWaitingRoom("admitted", targetId, room, waiters.size);

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

        logState();
      }
      return;
    }

    if (parsed.action === "reject" && ws.data.isHost && room) {
      const targetId = (parsed.data as any)?.peerId as string | undefined;
      if (!targetId) {
        console.warn(
          `${LOG_COLORS.red}[${timestamp()}] Reject failed: no targetId${
            LOG_COLORS.reset
          }`
        );
        return;
      }
      const waiters = waitingRooms.get(room);
      const targetWs = targetId ? clients.get(targetId) : undefined;
      if (waiters && waiters.has(targetId) && targetWs) {
        waiters.delete(targetId);
        waitingRooms.set(room, waiters);

        logWaitingRoom("rejected", targetId, room, waiters.size);

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

        logState();
      }
      return;
    }

    if (parsed.action === "raise-hand" && room) {
      console.log(
        `${LOG_COLORS.yellow}[${timestamp()}] ✋ RAISE HAND${
          LOG_COLORS.reset
        } peerId=${ws.data.peerId} room=${room}`
      );
      const targetPeer =
        ((parsed.data as any)?.peerId as string) ?? ws.data.peerId;
      const outgoing: OutgoingMessage = {
        type: "control",
        from: ws.data.peerId,
        room,
        action: "raise-hand",
        data: { peerId: targetPeer },
      };
      ws.publish(`room:${room}`, JSON.stringify(outgoing));
      return;
    }

    if (parsed.action === "hand-lowered" && room) {
      console.log(
        `${LOG_COLORS.dim}[${timestamp()}] ✋ LOWER HAND${
          LOG_COLORS.reset
        } peerId=${ws.data.peerId} room=${room}`
      );
      const targetPeer =
        ((parsed.data as any)?.peerId as string) ?? ws.data.peerId;
      const outgoing: OutgoingMessage = {
        type: "control",
        from: ws.data.peerId,
        room,
        action: "hand-lowered",
        data: { peerId: targetPeer },
      };
      ws.publish(`room:${room}`, JSON.stringify(outgoing));
      return;
    }

    if (parsed.action === "handoff-host" && ws.data.isHost && room) {
      const targetId = (parsed.data as any)?.peerId as string | undefined;
      if (!targetId) {
        console.warn(
          `${LOG_COLORS.red}[${timestamp()}] Handoff failed: no targetId${
            LOG_COLORS.reset
          }`
        );
        return;
      }
      const targetWs = clients.get(targetId);
      if (!targetWs || targetWs.data.room !== room) {
        console.warn(
          `${
            LOG_COLORS.red
          }[${timestamp()}] Handoff failed: target not in room${
            LOG_COLORS.reset
          }`
        );
        return;
      }
      ws.data.isHost = false;
      targetWs.data.isHost = true;
      sendControl(targetWs, {
        action: "host-promoted",
        room,
        from: ws.data.peerId,
        data: { from: ws.data.peerId },
      });
      sendControl(ws, {
        action: "host-demoted",
        room,
        data: { to: targetId },
      });
      console.log(
        `${LOG_COLORS.green}[${timestamp()}] Host handoff${
          LOG_COLORS.reset
        } from=${ws.data.peerId} to=${targetId} room=${room}`
      );
      return;
    }

    if (parsed.action === "set-display-name" && room) {
      const newDisplayName = (parsed.data as any)?.displayName as
        | string
        | undefined;
      if (newDisplayName) {
        ws.data.displayName = newDisplayName;
        console.log(
          `${LOG_COLORS.cyan}[${timestamp()}] Display name updated${
            LOG_COLORS.reset
          } peerId=${ws.data.peerId} displayName=${newDisplayName} room=${room}`
        );

        const set = roomMembers.get(room);
        if (set) {
          const peerDisplayNames: Record<string, string> = {};
          Array.from(set).forEach((id) => {
            const client = clients.get(id);
            peerDisplayNames[id] =
              client?.data?.displayName || `Guest ${id.toUpperCase()}`;
          });

          // Broadcast display name change to all peers in the room
          ws.publish(
            `room:${room}`,
            JSON.stringify({
              type: "control",
              from: ws.data.peerId,
              room,
              action: "display-name-changed",
              data: {
                peerId: ws.data.peerId,
                displayName: newDisplayName,
                peerDisplayNames,
              },
            } satisfies OutgoingMessage)
          );
        }
      }
      return;
    }

    // Unknown control action
    console.warn(
      `${LOG_COLORS.yellow}[${timestamp()}] Unknown control action: ${
        parsed.action
      }${LOG_COLORS.reset}`
    );
  }
}

function handleClose(ws: ServerWebSocket<ClientMeta>) {
  const { peerId, room } = ws.data;

  logDisconnect(peerId, room);

  ws.unsubscribe(`peer:${peerId}`);
  clients.delete(peerId);

  if (room) {
    const waiters = waitingRooms.get(room);
    if (waiters && waiters.delete(peerId)) {
      waitingRooms.set(room, waiters);
      logWaitingRoom("left", peerId, room, waiters.size);
      broadcastToHosts(room, {
        action: "waiting-list",
        data: { waiting: Array.from(waiters) },
      });
      logState();
      return;
    }

    ws.unsubscribe(`room:${room}`);
    const set = roomMembers.get(room);
    if (set) {
      set.delete(peerId);
      if (set.size === 0) {
        roomMembers.delete(room);
        console.log(
          `${
            LOG_COLORS.dim
          }[${timestamp()}] Room ${room} is now empty, removed from roomMembers${
            LOG_COLORS.reset
          }`
        );
      } else {
        roomMembers.set(room, set);
      }

      const peerDisplayNames: Record<string, string> = {};
      Array.from(set).forEach((id) => {
        const client = clients.get(id);
        peerDisplayNames[id] =
          client?.data?.displayName || `Guest ${id.toUpperCase()}`;
      });

      const presence: PresenceMessage = {
        type: "presence",
        room,
        peerId,
        peers: Array.from(set),
        peerDisplayNames,
        action: "leave",
      };

      logPresence("leave", peerId, room, set.size);
      logMessage("OUT", peerId, "presence:leave", {
        room,
        peers: Array.from(set),
      });

      ws.publish(`room:${room}`, JSON.stringify(presence));
    }

    logState();
  }
}

// Start server (async to support loading TLS certs)
async function startServer() {
  const tlsConfig = await getTlsConfig();
  const isSecure = !!tlsConfig;
  const protocol = isSecure ? "wss" : "ws";

  const serverOptions: ServeOptions<ClientMeta> = {
    hostname: HOST,
    port: PORT,
    ...(tlsConfig ? { tls: tlsConfig } : {}),
    fetch(req: Request, bunServer: Server<ClientMeta>) {
      const url = new URL(req.url);

      // Check if this is a WebSocket upgrade request
      const upgradeHeader = req.headers.get("upgrade");
      const isWebSocketRequest = upgradeHeader?.toLowerCase() === "websocket";

      // Health check endpoint (only for non-WebSocket requests)
      if (
        !isWebSocketRequest &&
        (url.pathname === "/health" || url.pathname === "/")
      ) {
        console.log(
          `${LOG_COLORS.dim}[${timestamp()}] HTTP GET ${url.pathname}${
            LOG_COLORS.reset
          }`
        );
        return new Response(
          JSON.stringify({
            status: "ok",
            protocol: isSecure ? "wss" : "ws",
            clients: clients.size,
            rooms: roomMembers.size,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const peerId = url.searchParams.get("peerId");
      const displayName = url.searchParams.get("displayName") || undefined;
      const room = url.searchParams.get("room");
      const isHost = url.searchParams.get("host") === "1";
      const waitingRoom = url.searchParams.get("waitingRoom") === "1";

      console.log(
        `${LOG_COLORS.dim}[${timestamp()}] HTTP UPGRADE REQUEST${
          LOG_COLORS.reset
        }`,
        `peerId=${peerId}`,
        `displayName=${displayName}`,
        `room=${room}`,
        `isHost=${isHost}`,
        `waitingRoom=${waitingRoom}`
      );

      if (!peerId) {
        console.warn(
          `${LOG_COLORS.red}[${timestamp()}] Rejected: missing peerId${
            LOG_COLORS.reset
          }`
        );
        return new Response("peerId query param is required", { status: 400 });
      }

      const upgraded = bunServer.upgrade(req, {
        data: {
          peerId,
          displayName,
          room,
          isHost,
          waitingRoom,
          admitted: isHost ? true : !waitingRoom,
        },
      });
      if (!upgraded) {
        console.error(
          `${
            LOG_COLORS.red
          }[${timestamp()}] WebSocket upgrade FAILED for ${peerId}${
            LOG_COLORS.reset
          }`
        );
        return new Response("WebSocket upgrade failed", { status: 500 });
      }

      return undefined;
    },
    websocket: {
      open: handleOpen,
      message: handleMessage,
      close: handleClose,
    },
  };

  const liveServer = Bun.serve<ClientMeta>(serverOptions);

  console.log("");
  console.log(
    `${LOG_COLORS.bright}═══════════════════════════════════════════════════════════════${LOG_COLORS.reset}`
  );
  console.log(
    `${LOG_COLORS.green}${LOG_COLORS.bright}  Signaling Server Started${LOG_COLORS.reset}`
  );
  console.log(
    `${LOG_COLORS.bright}═══════════════════════════════════════════════════════════════${LOG_COLORS.reset}`
  );
  console.log(
    `  ${LOG_COLORS.cyan}Mode:${LOG_COLORS.reset}      ${
      isSecure
        ? `${LOG_COLORS.green}SECURE (TLS)${LOG_COLORS.reset}`
        : `${LOG_COLORS.yellow}INSECURE (no TLS)${LOG_COLORS.reset}`
    }`
  );
  console.log(
    `  ${LOG_COLORS.cyan}Local:${LOG_COLORS.reset}     ${protocol}://localhost:${liveServer.port}`
  );
  console.log(
    `  ${LOG_COLORS.cyan}Network:${LOG_COLORS.reset}   ${protocol}://<your-lan-ip>:${liveServer.port}`
  );
  if (!isSecure) {
    console.log(
      `${LOG_COLORS.bright}───────────────────────────────────────────────────────────────${LOG_COLORS.reset}`
    );
    console.log(
      `  ${LOG_COLORS.yellow}To enable WSS, set environment variables:${LOG_COLORS.reset}`
    );
    console.log(
      `  ${LOG_COLORS.dim}  SSL_CERT_PATH=/path/to/fullchain.pem${LOG_COLORS.reset}`
    );
    console.log(
      `  ${LOG_COLORS.dim}  SSL_KEY_PATH=/path/to/privkey.pem${LOG_COLORS.reset}`
    );
  }
  console.log(
    `${LOG_COLORS.bright}═══════════════════════════════════════════════════════════════${LOG_COLORS.reset}`
  );
  console.log(
    `  ${LOG_COLORS.dim}Verbose logging enabled - all messages will be logged${LOG_COLORS.reset}`
  );
  console.log(
    `${LOG_COLORS.bright}═══════════════════════════════════════════════════════════════${LOG_COLORS.reset}`
  );
  console.log("");

  // Periodic state dump every 30 seconds (only if there are clients)
  setInterval(() => {
    if (clients.size > 0) {
      console.log("");
      console.log(
        `${LOG_COLORS.bright}───────────────────────────────────────────────────────────────${LOG_COLORS.reset}`
      );
      console.log(
        `${LOG_COLORS.cyan}[${timestamp()}] PERIODIC STATE DUMP${
          LOG_COLORS.reset
        }`
      );
      logState();
      console.log(
        `${LOG_COLORS.bright}───────────────────────────────────────────────────────────────${LOG_COLORS.reset}`
      );
      console.log("");
    }
  }, 30000);
}

// Start the server
startServer().catch((error) => {
  console.error(
    `${LOG_COLORS.red}Failed to start server:${LOG_COLORS.reset}`,
    error
  );
});
