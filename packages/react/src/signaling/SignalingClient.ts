export type EventMap = {
  open: void;
  close: CloseEvent | undefined;
  error: Error;
  signal: { from: string; data: unknown };
  broadcast: { from: string; room?: string | null; data: unknown };
  control: {
    action: string;
    from: string;
    room?: string | null;
    data?: unknown;
  };
  presence: {
    room?: string | null;
    peerId: string;
    peers: string[];
    action: "join" | "leave";
  };
};

type EventKey = keyof EventMap;

type Handler<K extends EventKey> = (payload: EventMap[K]) => void;

function createEmitter() {
  const listeners = new Map<EventKey, Set<Handler<any>>>();
  return {
    on<K extends EventKey>(event: K, handler: Handler<K>) {
      const set = listeners.get(event) ?? new Set();
      set.add(handler as Handler<any>);
      listeners.set(event, set);
    },
    off<K extends EventKey>(event: K, handler: Handler<K>) {
      const set = listeners.get(event);
      if (!set) return;
      set.delete(handler as Handler<any>);
      if (set.size === 0) listeners.delete(event);
    },
    emit<K extends EventKey>(event: K, payload: EventMap[K]) {
      const set = listeners.get(event);
      if (!set) return;
      for (const handler of Array.from(set)) handler(payload);
    },
  };
}

export type SignalingClientOptions = {
  url: string;
  peerId: string;
  room?: string | null;
  isHost?: boolean;
  enableWaitingRoom?: boolean;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
};

type IncomingMessage =
  | { type: "signal"; from: string; data: unknown }
  | { type: "broadcast"; from: string; room?: string | null; data: unknown }
  | {
      type: "control";
      from: string;
      room?: string | null;
      action: string;
      data?: unknown;
    }
  | {
      type: "presence";
      room?: string | null;
      peerId: string;
      peers: string[];
      action: "join" | "leave";
    };

type OutgoingMessage =
  | { type: "signal"; to: string; data: unknown }
  | { type: "broadcast"; data: unknown }
  | { type: "control"; action: string; data?: unknown };

export class SignalingClient {
  private ws: WebSocket | null = null;
  private options: SignalingClientOptions;
  private emitter = createEmitter();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean;
  private pendingQueue: OutgoingMessage[] = [];

  constructor(options: SignalingClientOptions) {
    this.options = options;
    this.shouldReconnect = options.autoReconnect ?? true;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const { url, peerId, room, isHost, enableWaitingRoom } = this.options;
    const params = new URLSearchParams({ peerId });
    if (room) params.set("room", room);
    if (isHost) params.set("host", "1");
    if (enableWaitingRoom) params.set("waitingRoom", "1");
    const wsUrl = `${url}?${params.toString()}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.addEventListener("open", () => {
      this.emitter.emit("open", undefined as void);
      this.flushQueue();
    });

    this.ws.addEventListener("message", (event) => {
      const payload = typeof event.data === "string" ? event.data : "";
      try {
        const parsed: IncomingMessage = JSON.parse(payload);
        if (parsed.type === "signal") {
          this.emitter.emit("signal", { from: parsed.from, data: parsed.data });
        } else if (parsed.type === "broadcast") {
          this.emitter.emit("broadcast", {
            from: parsed.from,
            room: parsed.room,
            data: parsed.data,
          });
        } else if (parsed.type === "presence") {
          this.emitter.emit("presence", {
            room: parsed.room,
            peerId: parsed.peerId,
            peers: parsed.peers,
            action: parsed.action,
          });
        } else if (parsed.type === "control") {
          this.emitter.emit("control", {
            from: parsed.from,
            room: parsed.room,
            action: parsed.action,
            data: parsed.data,
          });
        }
      } catch (error) {
        this.emitter.emit("error", error as Error);
      }
    });

    this.ws.addEventListener("close", (event) => {
      this.emitter.emit("close", event);
      this.scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      this.emitter.emit("error", new Error("WebSocket error"));
    });
  }

  close() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
    this.ws = null;
  }

  sendSignal(to: string, data: unknown) {
    this.enqueue({ type: "signal", to, data });
  }

  broadcast(data: unknown) {
    this.enqueue({ type: "broadcast", data });
  }

  sendControl(action: string, data?: unknown) {
    this.enqueue({ type: "control", action, data });
  }

  on<K extends EventKey>(event: K, handler: Handler<K>) {
    this.emitter.on(event, handler);
  }

  off<K extends EventKey>(event: K, handler: Handler<K>) {
    this.emitter.off(event, handler);
  }

  private enqueue(message: OutgoingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return;
    }
    this.pendingQueue.push(message);
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.pendingQueue.length) {
      const msg = this.pendingQueue.shift();
      if (msg) this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;
    const delay = this.options.reconnectDelayMs ?? 1000;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }
}
