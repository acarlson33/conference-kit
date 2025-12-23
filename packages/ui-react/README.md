# @conference-kit/ui-react

Tailwind-ready React UI components for conferencing UIs. These are presentational helpers that pair well with `@conference-kit/react` state.

## Install

```bash
npm install @conference-kit/ui-react
```

Peer deps: React 18+, React DOM, TailwindCSS 3.4+.

## Components

- `ParticipantGrid`, `ParticipantTile`: display remote/local `MediaStream` tiles with connection status.
- `RosterList`: simple list of roster entries (e.g., peers waiting, admitted, or self).
- `ConnectionBadge`: chips for signaling/media/data status.
- `ControlBar`: button row hooks to your handlers (join/leave/mute/video/screen share/reset).
- `ChatPanel`: lightweight message list/input scaffold.
- Icons: `SignalIcon`, `WifiOffIcon`, etc.

Types (`ParticipantView`, `RosterEntry`, `ControlHandlers`, `ConnectionStatus`) describe the shape of data you pass in.

## Quick example

```tsx
import {
  ParticipantGrid,
  ConnectionBadge,
  type ParticipantView,
} from "@conference-kit/ui-react";

const tiles: ParticipantView[] = [
  {
    id: "me",
    label: "You",
    stream: localStream,
    connectionState: "connected",
    isLocal: true,
  },
  {
    id: "peer-1",
    label: "Peer 1",
    stream: remote1,
    connectionState: "connected",
  },
];

export function CallUi() {
  return (
    <div className="space-y-4">
      <ConnectionBadge
        status={{ signaling: "open", media: "ready", data: "ready" }}
      />
      <ParticipantGrid participants={tiles} />
    </div>
  );
}
```

All components are unopinionated about state; wire them to your hooks/actions.

## Build

```bash
npm run build
```
