# @conference-kit/core

Minimal, typed WebRTC building blocks: a `Peer` class plus the supporting types you need to wire signaling and media yourself.

## Install

```bash
npm install @conference-kit/core
```

## What it provides

- `Peer`: typed wrapper around `RTCPeerConnection` with optional data channel creation, track helpers, and a tiny event emitter.
- Types: `PeerConfig`, `PeerSide`, `SignalData`, `PeerControls`, and `PeerEvents` for safe signaling and media handling.

## Quick start

```ts
import { Peer, type SignalData } from "@conference-kit/core";

// Decide which side initiates based on your app's rule
const peer = new Peer({ side: "initiator", trickle: true });

// Send outbound signaling to your server/peer
peer.on("signal", (data: SignalData) => sendToRemote(JSON.stringify(data)));

// Receive signaling from your server/peer
async function onRemoteSignal(payload: unknown) {
  await peer.signal(payload as SignalData);
}

peer.on("stream", (remote) => attachRemote(remote));
peer.on("data", (message) => console.log("received", message));
peer.on("connect", () => console.log("peer connected"));
```

Key helpers:

- `addStream/removeStream`: keep media in sync with your connection.
- `send(data)`: push strings/buffers over the data channel (throws if not open).
- `signal(data)`: apply offers/answers/candidates you received from signaling.

## Events

- `signal` — outbound SDP/candidates to relay.
- `stream` / `track` — remote media.
- `data` — data channel messages.
- `connect`, `close`, `error`, `iceStateChange`, `connectionStateChange` — connection lifecycle.

## Building

```bash
npm run build
```

Emits ESM + `.d.ts` to `dist/`.
