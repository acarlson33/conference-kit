import { useEffect, useMemo, useState } from "react";
import {
  ErrorBanner,
  StatusBadge,
  VideoPlayer,
  useCall,
  useCallState,
  useDataChannelMessages,
  useMediaStream,
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

export function App() {
  const [peerId] = useState(() => randomId());
  const [targetId, setTargetId] = useState("");
  const [signalingUrl, setSignalingUrl] = useState(defaultUrl);
  const [clientError, setClientError] = useState<string | null>(null);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeVideo, setIncludeVideo] = useState(true);
  const [messageText, setMessageText] = useState("ping");

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

  const call = useCall({
    peerId,
    signalingUrl,
    mediaConstraints: { audio: includeAudio, video: includeVideo },
  });

  const media = useMediaStream({
    constraints: { audio: includeAudio, video: includeVideo },
  });

  const data = useDataChannelMessages(call.peer, { limit: 50 });
  const callView = useCallState(call, { hasTarget: Boolean(targetId) });

  const activeError =
    clientError ||
    call.error?.message ||
    data.error?.message ||
    media.error?.message ||
    null;

  const mediaMode = useMemo(() => {
    if (includeAudio && includeVideo) return "AV";
    if (includeAudio && !includeVideo) return "Audio";
    if (!includeAudio && includeVideo) return "Video";
    return "Data";
  }, [includeAudio, includeVideo]);

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
            <div style={{ fontSize: 24, fontWeight: 700 }}>WebRTC Call</div>
            <div style={{ color: "#94a3b8" }}>
              Secure origin required for media; data-only works without devices
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge label={`Call ${callView.callLabel}`} tone="neutral" />
            <StatusBadge label={`Conn ${callView.connLabel}`} tone="neutral" />
            <StatusBadge label={`ICE ${callView.iceLabel}`} tone="neutral" />
            <StatusBadge
              label={data.ready ? "Data ready" : "Data idle"}
              tone={data.ready ? "success" : "neutral"}
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
                <span style={{ color: "#94a3b8", fontSize: 13 }}>
                  Target ID
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
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Paste the other peer ID"
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
              <StatusBadge label={`${mediaMode} mode`} tone="neutral" />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => media.requestStream()}
                style={primaryButton}
              >
                Request Media
              </button>
              <button onClick={() => media.stopStream()} style={ghostButton}>
                Release Media
              </button>
              <button
                onClick={() => call.call(targetId)}
                disabled={!callView.canCall}
                style={primaryButton}
              >
                Call
              </button>
              <button
                onClick={() => call.answer()}
                disabled={!callView.canAnswer}
                style={secondaryButton}
              >
                Answer
              </button>
              <button
                onClick={() => call.hangUp()}
                disabled={!callView.canHangUp}
                style={ghostButton}
              >
                Hang Up
              </button>
              <button onClick={() => call.reset()} style={ghostButton}>
                Reset Peer
              </button>
              <button onClick={() => call.muteAudio(true)} style={ghostButton}>
                Mute A
              </button>
              <button onClick={() => call.muteAudio(false)} style={ghostButton}>
                Unmute A
              </button>
              <button onClick={() => call.muteVideo(true)} style={ghostButton}>
                Mute V
              </button>
              <button onClick={() => call.muteVideo(false)} style={ghostButton}>
                Unmute V
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatusBadge
                label={`Peer ${call.peer ? "ready" : "idle"}`}
                tone={call.peer ? "success" : "neutral"}
              />
              <StatusBadge
                label={`Media ${media.ready ? "ready" : "not ready"}`}
                tone={media.ready ? "success" : "warn"}
              />
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Local</div>
                <StatusBadge label="Muted locally" tone="neutral" />
              </div>
              <VideoPlayer
                stream={media.stream ?? call.localStream}
                style={{
                  width: "100%",
                  background: "#0b1220",
                  borderRadius: 8,
                }}
                muted
              />
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Remote</div>
                <StatusBadge
                  label={call.remoteStream ? "Receiving" : "Idle"}
                  tone="neutral"
                />
              </div>
              <VideoPlayer
                stream={call.remoteStream}
                style={{
                  width: "100%",
                  background: "#0b1220",
                  borderRadius: 8,
                }}
              />
            </div>
          </section>
        </div>

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>Data Channel</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                Data-only mode works without camera/mic
              </div>
            </div>
            <StatusBadge
              label={data.ready ? "Open" : "Closed"}
              tone={data.ready ? "success" : "neutral"}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Message"
              style={{
                flex: "1 1 280px",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
            <button
              onClick={() => data.sendMessage(messageText || "ping")}
              disabled={!data.ready}
              style={primaryButton}
            >
              Send
            </button>
          </div>
          <div
            style={{
              maxHeight: 200,
              overflow: "auto",
              display: "grid",
              gap: 8,
              background: "#0b1220",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #1f2937",
            }}
          >
            {data.messages.length === 0 && (
              <div style={{ color: "#94a3b8" }}>No messages yet</div>
            )}
            {data.messages.map(
              (msg: {
                id: string;
                direction: "in" | "out";
                payload: unknown;
              }) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: msg.direction === "in" ? "#0f172a" : "#111827",
                  }}
                >
                  <span style={{ color: "#cbd5e1" }}>
                    {typeof msg.payload === "string"
                      ? msg.payload
                      : JSON.stringify(msg.payload)}
                  </span>
                  <StatusBadge
                    label={msg.direction === "in" ? "In" : "Out"}
                    tone={msg.direction === "in" ? "neutral" : "success"}
                  />
                </div>
              )
            )}
          </div>
        </section>

        <section style={{ color: "#94a3b8", fontSize: 13 }}>
          HTTPS/LAN: use `VITE_DEV_HTTPS=true bun run dev` or Chrome flag
          `--unsafely-treat-insecure-origin-as-secure=http://your-lan:5173` for
          media. Data-only works over HTTP.
        </section>
      </div>
    </div>
  );
}
