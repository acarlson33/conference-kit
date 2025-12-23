import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ErrorBanner,
  StatusBadge,
  VideoPlayer,
  useMeshRoom,
} from "@conference-kit/react";

const randomId = () => Math.random().toString(36).slice(2, 8);

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

const redactSignalUrl =
  (import.meta.env.VITE_REDACT_SIGNAL_URL as string | undefined) === "true";

const deriveLocalUrl = () => {
  const envPort = import.meta.env.VITE_SIGNAL_PORT as string | undefined;
  if (typeof window === "undefined") {
    return envPort ? `ws://localhost:${envPort}` : "ws://localhost:8787";
  }
  const port = envPort ?? "8787";
  const isSecure = window.location.protocol === "https:";
  const host = window.location.hostname || "localhost";
  return `${isSecure ? "wss" : "ws"}://${host}:${port}`;
};

const defaultUrl = deriveDefaultUrl();
const defaultRoom = "lobby";

const buttonBase: CSSProperties = {
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#1f2937",
  color: "#e2e8f0",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  ...buttonBase,
  background: "#2563eb",
  border: "1px solid #1d4ed8",
};

const secondaryButton: CSSProperties = {
  ...buttonBase,
  background: "#0f172a",
};

const ghostButton: CSSProperties = {
  ...buttonBase,
  background: "transparent",
};

type Tile = {
  id: string;
  label: string;
  stream?: MediaStream | null;
  connection: string;
  isActive: boolean;
  raisedHand: boolean;
  isSelf: boolean;
};

type RoomExperienceProps = {
  peerId: string;
  room: string;
  signalingUrl: string;
  includeAudio: boolean;
  includeVideo: boolean;
  isHost: boolean;
  features: {
    enableWaitingRoom: boolean;
    enableHostControls: boolean;
    enableActiveSpeaker: boolean;
  };
  onLeave: () => void;
};

function RoomExperience({
  peerId,
  room,
  signalingUrl,
  includeAudio,
  includeVideo,
  isHost,
  features,
  onLeave,
}: RoomExperienceProps) {
  const mesh = useMeshRoom({
    peerId,
    room,
    signalingUrl,
    isHost,
    mediaConstraints: { audio: includeAudio, video: includeVideo },
    features: {
      enableWaitingRoom: features.enableWaitingRoom,
      enableHostControls: features.enableHostControls,
      enableActiveSpeaker: features.enableActiveSpeaker,
    },
  });

  useEffect(() => {
    return () => mesh.leave();
  }, [mesh.leave]);

  useEffect(() => {
    if (includeAudio || includeVideo) {
      void mesh.requestStream();
    } else {
      mesh.stopStream();
    }
  }, [includeAudio, includeVideo, mesh.requestStream, mesh.stopStream]);

  const activeError = mesh.error?.message ?? mesh.mediaError?.message ?? null;

  const tiles = useMemo<Tile[]>(() => {
    const remote = mesh.participants.map((p) => ({
      id: p.id,
      label: p.id,
      stream: p.remoteStream ?? undefined,
      connection: p.connectionState,
      isActive: mesh.activeSpeakerId === p.id,
      raisedHand: mesh.raisedHands.has(p.id),
      isSelf: false,
    }));
    const local: Tile = {
      id: peerId,
      label: `${peerId} (you)`,
      stream: mesh.localStream ?? undefined,
      connection: mesh.ready ? "local" : "idle",
      isActive: mesh.activeSpeakerId === peerId,
      raisedHand: mesh.raisedHands.has(peerId),
      isSelf: true,
    };
    return [local, ...remote];
  }, [
    mesh.activeSpeakerId,
    mesh.localStream,
    mesh.participants,
    mesh.raisedHands,
    mesh.ready,
    peerId,
  ]);

  const hasRaisedHand = mesh.raisedHands.has(peerId);
  const audioEnabled =
    mesh.localStream?.getAudioTracks().some((t) => t.enabled) ?? false;
  const videoEnabled =
    mesh.localStream?.getVideoTracks().some((t) => t.enabled) ?? false;

  const mediaStatus = mesh.ready
    ? "Media ready"
    : mesh.requesting
    ? "Requesting"
    : "No media";

  if (mesh.inWaitingRoom) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {activeError && <ErrorBanner message={activeError} />}
        <div
          style={{
            padding: 18,
            border: "1px solid #1f2937",
            borderRadius: 12,
            background: "#0f172a",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>Waiting room</div>
          <div style={{ color: "#cbd5e1" }}>
            You are waiting to be admitted by the host.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={primaryButton} onClick={onLeave}>
              Leave room
            </button>
            <button
              style={ghostButton}
              onClick={() =>
                hasRaisedHand ? mesh.lowerHand() : mesh.raiseHand()
              }
            >
              {hasRaisedHand ? "Lower hand" : "Raise hand"}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            label={mediaStatus}
            tone={mesh.ready ? "success" : mesh.requesting ? "warn" : "neutral"}
          />
          {features.enableWaitingRoom && (
            <StatusBadge
              label={`Waiting ${mesh.waitingList.length}`}
              tone={mesh.waitingList.length ? "warn" : "neutral"}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => mesh.requestStream()} style={primaryButton}>
            Request media
          </button>
          <button onClick={() => mesh.stopStream()} style={ghostButton}>
            Release media
          </button>
          <button onClick={() => onLeave()} style={secondaryButton}>
            Leave room
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
                  border: `2px solid ${tile.isActive ? "#22c55e" : "#1f2937"}`,
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
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, display: "flex", gap: 6 }}>
                    {tile.raisedHand && <span>✋</span>}
                    <span>{tile.label}</span>
                  </div>
                  <StatusBadge label={tile.connection} tone="neutral" />
                </div>
                <VideoPlayer
                  stream={tile.stream}
                  style={{
                    width: "100%",
                    background: "#030712",
                    borderRadius: 8,
                    minHeight: 140,
                  }}
                  muted={tile.isSelf}
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
                  gap: 8,
                }}
              >
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{id}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {mesh.raisedHands.has(id) && <span>✋</span>}
                  {mesh.activeSpeakerId === id && (
                    <StatusBadge label="Speaking" tone="success" />
                  )}
                  <StatusBadge
                    label={id === peerId ? "You" : "Peer"}
                    tone={id === peerId ? "success" : "neutral"}
                  />
                </div>
              </div>
            ))}
          </div>

          {isHost &&
            features.enableWaitingRoom &&
            mesh.waitingList.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Waiting room</div>
                {mesh.waitingList.map((id) => (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      border: "1px solid #1f2937",
                      borderRadius: 8,
                      background: "#0b1220",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{id}</span>
                    <button
                      style={primaryButton}
                      onClick={() => mesh.admitPeer(id)}
                    >
                      Admit
                    </button>
                    <button
                      style={ghostButton}
                      onClick={() => mesh.rejectPeer(id)}
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            )}

          {features.enableHostControls && (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 600 }}>Raised hands</div>
              {mesh.raisedHands.size === 0 && (
                <div style={{ color: "#94a3b8" }}>No hands raised</div>
              )}
              {Array.from(mesh.raisedHands).map((id) => (
                <div key={id} style={{ color: "#e2e8f0" }}>
                  ✋ {id}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          <button
            style={secondaryButton}
            onClick={() =>
              mesh.localStream
                ?.getAudioTracks()
                .forEach((track) => (track.enabled = !track.enabled))
            }
          >
            {audioEnabled ? "Mute audio" : "Unmute audio"}
          </button>
          <button
            style={secondaryButton}
            onClick={() =>
              mesh.localStream
                ?.getVideoTracks()
                .forEach((track) => (track.enabled = !track.enabled))
            }
          >
            {videoEnabled ? "Stop video" : "Start video"}
          </button>
          {features.enableHostControls && (
            <button
              style={ghostButton}
              onClick={() =>
                hasRaisedHand ? mesh.lowerHand() : mesh.raiseHand()
              }
            >
              {hasRaisedHand ? "Lower hand" : "Raise hand"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge label={mediaStatus} tone="neutral" />
          <button style={secondaryButton} onClick={onLeave}>
            Leave room
          </button>
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
  const [isHost, setIsHost] = useState(false);
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(true);
  const [enableHostControls, setEnableHostControls] = useState(true);
  const [enableActiveSpeaker, setEnableActiveSpeaker] = useState(true);
  const [showSignalUrl, setShowSignalUrl] = useState(!redactSignalUrl);

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

  const featureConfig = useMemo(
    () => ({
      enableWaitingRoom,
      enableHostControls,
      enableActiveSpeaker,
    }),
    [enableActiveSpeaker, enableHostControls, enableWaitingRoom]
  );

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
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Mesh room</div>
            <div style={{ color: "#94a3b8" }}>
              Waiting rooms, host controls, and active speaker highlight.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge label={`Peer ${peerId}`} tone="neutral" />
            <StatusBadge label={`Room ${room}`} tone="neutral" />
            <StatusBadge
              label={joined ? "Joined" : "Idle"}
              tone={joined ? "success" : "neutral"}
            />
            {isHost && <StatusBadge label="Host" tone="success" />}
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
                  type={showSignalUrl ? "text" : "password"}
                  value={showSignalUrl ? signalingUrl : ""}
                  placeholder={
                    !showSignalUrl && redactSignalUrl
                      ? "wss://<redacted>"
                      : "ws(s)://<host>:8787"
                  }
                  autoComplete="off"
                  onChange={(e) => {
                    setSignalingUrl(e.target.value);
                    if (!showSignalUrl) setShowSignalUrl(true);
                  }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={ghostButton}
                    onClick={() => setSignalingUrl(deriveLocalUrl())}
                  >
                    Use this host
                  </button>
                  {redactSignalUrl && (
                    <button
                      style={ghostButton}
                      onClick={() => setShowSignalUrl((v) => !v)}
                    >
                      {showSignalUrl ? "Hide URL" : "Show URL"}
                    </button>
                  )}
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={isHost}
                  onChange={(e) => setIsHost(e.target.checked)}
                />
                Host role
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={enableWaitingRoom}
                  onChange={(e) => setEnableWaitingRoom(e.target.checked)}
                />
                Waiting room
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={enableHostControls}
                  onChange={(e) => setEnableHostControls(e.target.checked)}
                />
                Host controls (raise hand)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={enableActiveSpeaker}
                  onChange={(e) => setEnableActiveSpeaker(e.target.checked)}
                />
                Active speaker
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setJoined(true)}
                style={primaryButton}
                disabled={!room.trim()}
              >
                Join room
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
                Join multiple tabs to see the waiting room and host controls in
                action. Hosts can admit/reject peers, everyone can raise a hand,
                and the active speaker badge highlights who's talking.
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
            isHost={isHost}
            features={featureConfig}
            onLeave={() => setJoined(false)}
          />
        )}

        <section style={{ color: "#94a3b8", fontSize: 13 }}>
          HTTPS/LAN: use VITE_DEV_HTTPS=true bun run dev or Chrome flag
          --unsafely-treat-insecure-origin-as-secure=http://your-lan:5173 for
          media capture.
        </section>
      </div>
    </div>
  );
}
