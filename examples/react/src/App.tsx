import { useEffect, useMemo, useState } from "react";
import {
  ErrorBanner,
  StatusBadge,
  VideoPlayer,
  useMeshRoom,
} from "@webrtc-kit/react";

const primaryButton = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#2563eb",
  color: "#e2e8f0",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  fontWeight: 600,
  cursor: "pointer",
};

const ghostButton = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #1f2937",
  background: "#0b1220",
  color: "#cbd5e1",
  cursor: "pointer",
};

const deriveDefaultUrl = () => {
  const envHost = import.meta.env.VITE_SIGNAL_HOST as string | undefined;
  const envPort = import.meta.env.VITE_SIGNAL_PORT as string | undefined;
  if (envHost) {
    const port = envPort ?? "8787";
    const scheme = envHost.startsWith("ws") ? "" : "ws://";
    return `${scheme}${envHost}${envHost.includes(":") ? "" : `:${port}`}`;
  }

  if (typeof window === "undefined") return "ws://localhost:8787";
  const isSecure = window.location.protocol === "https:";
  const host = window.location.hostname || "localhost";
  const port = envPort ?? "8787";
  return `${isSecure ? "wss" : "ws"}://${host}:${port}`;
};

const defaultUrl = deriveDefaultUrl();
const randomId = () => Math.random().toString(36).slice(2, 8);
const defaultRoom = "lobby";

const deriveLocalUrl = () => {
  if (typeof window === "undefined") return defaultUrl;
  const isSecure = window.location.protocol === "https:";
  const host = window.location.hostname || "localhost";
  return `${isSecure ? "wss" : "ws"}://${host}:8787`;
};

type RoomExperienceProps = {
  peerId: string;
  room: string;
  signalingUrl: string;
  includeAudio: boolean;
  includeVideo: boolean;
  onLeave: () => void;
};

function RoomExperience({
  peerId,
  room,
  signalingUrl,
  includeAudio,
  includeVideo,
  onLeave,
}: RoomExperienceProps) {
  const mesh = useMeshRoom({
    peerId,
    room,
    signalingUrl,
    mediaConstraints: { audio: includeAudio, video: includeVideo },
    autoReconnect: true,
  });

  const activeError = mesh.mediaError?.message || mesh.error?.message || null;
  useEffect(() => () => mesh.leave(), [mesh.leave]);

  const tiles = useMemo(() => {
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 600 }}>Connection tips</div>
      <ul
        style={{
          paddingLeft: 18,
          margin: 0,
          color: "#94a3b8",
          lineHeight: 1.5,
        }}
      >
        <li>Start signaling: `bun run dev:signal` (default ws://host:8787)</li>
        <li>
          If the Signal badge is not green, the WebSocket isn’t reachable
          (firewall/host/port).
        </li>
        <li>
          For HTTPS pages use wss:// and a cert on the signaling host, or run
          the page over HTTP.
        </li>
        <li>
          Media capture needs a secure origin in most browsers; data-only works
          on HTTP.
        </li>
      </ul>
    </div>;
    const remotes = mesh.participants.map((p) => ({
      id: p.id,
      stream: p.remoteStream,
      connection: p.connectionState,
    }));
    return [
      {
        id: peerId,
        label: "You",
        stream: mesh.localStream,
        connection: mesh.ready ? "connected" : "new",
      },
      ...remotes.map((p) => ({
        id: p.id,
        label: p.id,
        stream: p.stream,
        connection: p.connection,
      })),
    ];
  }, [mesh.localStream, mesh.participants, mesh.ready, peerId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {activeError && <ErrorBanner message={activeError} />}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge label={`Room ${room}`} tone="neutral" />
          <StatusBadge label={`Roster ${mesh.roster.length}`} tone="neutral" />
          <StatusBadge
            label={`Peers ${mesh.participants.length}`}
            tone="neutral"
          />
          <StatusBadge
            label={`Signal ${mesh.signalingStatus}`}
            tone={mesh.signalingStatus === "open" ? "success" : "warn"}
          />
          <StatusBadge
            label={
              mesh.ready
                ? "Media ready"
                : mesh.requesting
                ? "Requesting"
                : "No media"
            }
            tone={mesh.ready ? "success" : mesh.requesting ? "warn" : "neutral"}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => mesh.requestStream()} style={primaryButton}>
            Request Media
          </button>
          <button onClick={() => mesh.stopStream()} style={ghostButton}>
            Release Media
          </button>
          <button onClick={() => onLeave()} style={secondaryButton}>
            Leave Room
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1.6fr 1fr",
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600 }}>Participants</div>
            <StatusBadge label={`${tiles.length} tiles`} tone="neutral" />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.id}
                style={{
                  background: "#0b1220",
                  border: "1px solid #1f2937",
                  borderRadius: 10,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{tile.label}</div>
                  <StatusBadge label={tile.connection} tone="neutral" />
                </div>
                <VideoPlayer
                  stream={tile.stream}
                  style={{
                    width: "100%",
                    background: "#030712",
                    borderRadius: 8,
                    minHeight: 120,
                  }}
                  muted={tile.id === peerId}
                />
              </div>
            ))}
            {tiles.length === 0 && (
              <div style={{ color: "#94a3b8" }}>Waiting for participants…</div>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>Roster</div>
          <div style={{ display: "grid", gap: 8 }}>
            {mesh.roster.length === 0 && (
              <div style={{ color: "#94a3b8" }}>No peers joined yet</div>
            )}
            {mesh.roster.map((id) => (
              <div
                key={id}
                style={{
                  border: "1px solid #1f2937",
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: id === peerId ? "#0f172a" : "#0b1220",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{id}</span>
                <StatusBadge
                  label={id === peerId ? "You" : "Peer"}
                  tone={id === peerId ? "success" : "neutral"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [peerId] = useState(() => randomId());
  const [signalingUrl, setSignalingUrl] = useState(defaultUrl);
  const [clientError, setClientError] = useState<string | null>(null);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeVideo, setIncludeVideo] = useState(true);
  const [room, setRoom] = useState(defaultRoom);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setClientError(event.message || "Unknown client error");
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        (event.reason as Error)?.message ??
        String(event.reason ?? "Promise rejection");
      setClientError(reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const activeError = clientError;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Mesh Room</div>
            <div style={{ color: "#94a3b8" }}>
              Join a named room and mesh-connect to everyone present
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge label={`Peer ${peerId}`} tone="neutral" />
            <StatusBadge label={`Room ${room}`} tone="neutral" />
            <StatusBadge
              label={joined ? "Joined" : "Idle"}
              tone={joined ? "success" : "neutral"}
            />
          </div>
        </header>

        {activeError && <ErrorBanner message={activeError} />}

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1.2fr 1fr",
          }}
        >
          <section
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>
                  Signaling URL
                </span>
                <input
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#0b1220",
                    color: "#e2e8f0",
                  }}
                  value={signalingUrl}
                  onChange={(e) => setSignalingUrl(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={ghostButton}
                    onClick={() => setSignalingUrl(deriveLocalUrl())}
                  >
                    Use this host
                  </button>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>
                    Tip: host your signaling on this LAN IP/port (default 8787)
                  </span>
                </div>
              </label>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Your ID</span>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#0b1220",
                    color: "#e2e8f0",
                  }}
                >
                  {peerId}
                </div>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Room</span>
                <input
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#0b1220",
                    color: "#e2e8f0",
                  }}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. lobby"
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                />
                Audio
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={includeVideo}
                  onChange={(e) => setIncludeVideo(e.target.checked)}
                />
                Video
              </label>
              <StatusBadge
                label={
                  includeAudio && includeVideo
                    ? "AV"
                    : includeAudio
                    ? "Audio"
                    : includeVideo
                    ? "Video"
                    : "Data"
                }
                tone="neutral"
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setJoined(true)}
                style={primaryButton}
                disabled={!room.trim()}
              >
                Join Room
              </button>
              <button
                onClick={() => setJoined(false)}
                style={ghostButton}
                disabled={!joined}
              >
                Leave
              </button>
            </div>
          </section>

          <section
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 600 }}>How it works</div>
              <div style={{ color: "#94a3b8", lineHeight: 1.5 }}>
                Each peer connects to the signaling server, announces presence,
                and builds a mesh connection to everyone else in the same room.
                Hit Join Room on multiple tabs to see the roster and tiles
                populate. Use HTTPS for media capture if your browser requires a
                secure origin.
              </div>
            </div>
          </section>
        </div>

        {joined && (
          <RoomExperience
            peerId={peerId}
            room={room || defaultRoom}
            signalingUrl={signalingUrl}
            includeAudio={includeAudio}
            includeVideo={includeVideo}
            onLeave={() => setJoined(false)}
          />
        )}

        <section style={{ color: "#94a3b8", fontSize: 13 }}>
          HTTPS/LAN: use `VITE_DEV_HTTPS=true bun run dev` or Chrome flag
          `--unsafely-treat-insecure-origin-as-secure=http://your-lan:5173` for
          media capture.
        </section>
      </div>
    </div>
  );
}
