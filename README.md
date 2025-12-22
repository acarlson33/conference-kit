# WebRTC Video & Voice Calls (Bun + React + Next.js)

Monorepo with a minimal WebRTC core, Bun-native signaling server, React/Next.js hooks, and runnable examples.

## Packages

- `@webrtc-kit/core`: Peer wrapper (events, data channel, media helpers).
- `@webrtc-kit/signaling-server`: Bun `Bun.serve` WebSocket signaling server.
- `@webrtc-kit/react`: Hooks/components (`useWebRTC`, `useCall`, `useDataChannel`, `useMediaStream`, `VideoPlayer`, `AudioPlayer`).
- `@webrtc-kit/nextjs`: Client-only re-export plus `dynamicClient` helper.

## Quickstart

1. Install deps: `bun install`

2) Start signaling server: `bun run dev:signal` (ws://localhost:8787). It binds to `0.0.0.0`, so peers on your LAN can connect via `ws://<your-lan-ip>:8787` (open firewall/port 8787).
3) Run React example: `cd examples/react && bun install && bun run dev`. You can override signaling host/port with `VITE_SIGNAL_HOST` / `VITE_SIGNAL_PORT`, otherwise it auto-uses the current host and port 8787.
4) Run Next.js example: `cd examples/nextjs && bun install && bun run dev`. Override signaling host/port with `NEXT_PUBLIC_SIGNAL_HOST` / `NEXT_PUBLIC_SIGNAL_PORT`, otherwise it auto-uses the current host and port 8787.

Use two browser tabs. Enter different peer IDs (one auto-generated per tab), share the signaling URL, and click **Call** / **Answer**.

## API Highlights

- `useCall({ peerId, signalingUrl, room?, mediaConstraints?, rtcConfig?, trickle? })` → call/answer/hangUp, `localStream`, `remoteStream`, `callState`, `muteAudio`, `muteVideo`, `sendData`.
- `useDataChannel(peer)` → `send(payload)`, `ready`, `lastMessage`.
- `useWebRTC` for lower-level control; `useMediaStream` for camera/mic management.
