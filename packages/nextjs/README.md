# @conference-kit/nextjs

Next.js-friendly entry point for the React bindings plus client-only helpers.

## Install

```bash
npm install @conference-kit/nextjs
```

Peer deps: Next 13+, React 18+.

## What you get

- Re-exports everything from `@conference-kit/react` for direct use in app/router components.
- `isClient`: boolean flag (`typeof window !== "undefined"`).
- `dynamicClient(factory, loading?)`: wraps `next/dynamic` with `ssr: false` to load browser-only components (e.g., ones that call `getUserMedia`).

## Usage

```tsx
import { dynamicClient, useMeshRoom } from "@conference-kit/nextjs";

const MeshClient = dynamicClient(() => import("./Mesh"));

export default function Page() {
  return <MeshClient />;
}

// Mesh.tsx (client component)
("use client");
import { useMeshRoom } from "@conference-kit/nextjs";

export default function Mesh() {
  const mesh = useMeshRoom({
    peerId: "a",
    room: "lobby",
    signalingUrl: "ws://localhost:8787",
  });
  return <div>Peers: {mesh.participants.length}</div>;
}
```

## Build

```bash
npm run build
```

Emits ESM + types to `dist/`.
