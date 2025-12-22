"use client";

import { useEffect, useMemo, useState } from "react";
import { VideoPlayer, useCall, useDataChannel } from "@conference-kit/nextjs";

const deriveDefaultUrl = () => {
  const envHost = process.env.NEXT_PUBLIC_SIGNAL_HOST;
  const envPort = process.env.NEXT_PUBLIC_SIGNAL_PORT;

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

export default function Page() {
  const [peerId] = useState(() => randomId());
  const [targetId, setTargetId] = useState("");
  const [signalingUrl, setSignalingUrl] = useState(defaultUrl);
  const [clientError, setClientError] = useState<string | null>(null);

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
    mediaConstraints: { audio: true, video: true },
  });
  const data = useDataChannel(call.peer);

  const status = useMemo(
    () =>
      [
        `call: ${call.callState}`,
        `conn: ${call.connectionState}`,
        `ice: ${call.iceState}`,
        `peer: ${call.peer ? "ready" : "-"}`,
      ].join(" | "),
    [call.callState, call.connectionState, call.iceState, call.peer]
  );

  return (
    <main style={{ padding: "1rem", fontFamily: "Inter, sans-serif" }}>
      <h1>WebRTC Next.js Example</h1>
      <p>Your ID: {peerId}</p>
      <label style={{ display: "block", marginBottom: 8 }}>
        Signaling URL
        <input
          style={{ display: "block", width: 320 }}
          value={signalingUrl}
          onChange={(e) => setSignalingUrl(e.target.value)}
        />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Target ID
        <input
          style={{ display: "block", width: 200 }}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />
      </label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button disabled={!targetId} onClick={() => call.call(targetId)}>
          Call
        </button>
        <button onClick={() => call.answer()}>Answer</button>
        <button onClick={() => call.hangUp()}>Hang Up</button>
        <button onClick={() => call.muteAudio(true)}>Mute A</button>
        <button onClick={() => call.muteAudio(false)}>Unmute A</button>
        <button onClick={() => call.muteVideo(true)}>Mute V</button>
        <button onClick={() => call.muteVideo(false)}>Unmute V</button>
      </div>
      <div style={{ marginBottom: 12 }}>Status: {status}</div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <h3>Local</h3>
          <VideoPlayer
            stream={call.localStream}
            style={{ width: "100%", background: "#111" }}
            muted
          />
        </div>
        <div>
          <h3>Remote</h3>
          <VideoPlayer
            stream={call.remoteStream}
            style={{ width: "100%", background: "#111" }}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <h3>Data channel</h3>
        <button onClick={() => call.sendData("ping")}>Send "ping"</button>
        <div>Ready: {data.ready ? "yes" : "no"}</div>
        <div>Last message: {JSON.stringify(data.lastMessage)}</div>
      </div>
      {(clientError || call.error) && (
        <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>
          {clientError || call.error?.message}
        </pre>
      )}
    </main>
  );
}
