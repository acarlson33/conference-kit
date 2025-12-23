# @conference-kit/react

React hooks and tiny UI primitives for building peer-to-peer calls on top of the `@conference-kit/core` peer and a signaling server.

## Install

```bash
npm install @conference-kit/react
```

Peer deps: React 18+.

## Key hooks

- `useMeshRoom` — mesh everyone in a room; exposes roster, participants, local stream, raised hands, waiting-room/host state, and helpers like `requestStream`, `admitPeer`, `rejectPeer`, `raiseHand`, `leave`.
- `useCall` / `useCallState` — 1:1 call helper with local/remote streams and call lifecycle.
- `useDataChannel` / `useDataChannelMessages` — send/receive arbitrary data over an RTC data channel.
- `useMediaStream`, `useScreenShare`, `useWebRTC` — focused utilities for media capture and connection wiring.

## Components

- `VideoPlayer`, `AudioPlayer` — attach a `MediaStream` to media elements.
- `StatusBadge`, `ErrorBanner` — lightweight status UI.

## Feature flags

`mergeFeatures` and `defaultFeatures` let you toggle capabilities (data channel, screen share, waiting room, host controls, active speaker detection) when calling `useMeshRoom`.

## Quick mesh example

```tsx
import { useMeshRoom, VideoPlayer } from "@conference-kit/react";

function Mesh({
  peerId,
  room,
  signalingUrl,
}: {
  peerId: string;
  room: string;
  signalingUrl: string;
}) {
  const mesh = useMeshRoom({
    peerId,
    room,
    signalingUrl,
    isHost: false,
    mediaConstraints: { audio: true, video: true },
    features: { enableWaitingRoom: true, enableHostControls: true },
  });

  return (
    <div>
      <button onClick={() => mesh.requestStream()}>Request media</button>
      <div>
        {mesh.participants.map((p) => (
          <VideoPlayer key={p.id} stream={p.remoteStream} muted={false} />
        ))}
      </div>
    </div>
  );
}
```

## Signaling client

`SignalingClient` is exposed if you need to build a custom hook or UI. It handles reconnects and emits presence, signal, broadcast, and control events.

## Build

```bash
npm run build
```

Outputs ESM and types to `dist/`.
