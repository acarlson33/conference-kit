# @conference-kit/ui-next

Next.js entry point for the React UI kit. It re-exports everything from `@conference-kit/ui-react` so you can import from a Next-scoped package.

## Install

```bash
npm install @conference-kit/ui-next
```

Peer deps: React 18+, React DOM, Next 13+, TailwindCSS 3.4+.

## Usage

```tsx
// app/call/page.tsx (app router)
import { ParticipantGrid, ConnectionBadge } from "@conference-kit/ui-next";

export default function Page() {
  return (
    <div className="space-y-4">
      <ConnectionBadge
        status={{ signaling: "open", media: "ready", data: "ready" }}
      />
      <ParticipantGrid participants={[]} />
    </div>
  );
}
```

Pair these components with state from `@conference-kit/react` (or `@conference-kit/nextjs`) inside client components.

## Build

```bash
npm run build
```
