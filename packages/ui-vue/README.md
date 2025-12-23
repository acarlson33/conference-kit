# @conference-kit/ui-vue

Vue 3 components for conferencing UIs. Presentational only—pair with state from `@conference-kit/vue`.

## Install

```bash
npm install @conference-kit/ui-vue
```

Peer deps: Vue 3.4+, TailwindCSS 3.4+.

## Components

- `ParticipantGrid`, `ParticipantTile`
- `RosterList`
- `ControlBar`
- `ChatPanel`
- `ConnectionBadge` (exported as default)

Each component accepts props mirroring the React UI kit (IDs, labels, media streams, connection status, handler callbacks).

## Quick example

```vue
<script setup lang="ts">
import { ParticipantGrid, ConnectionBadge } from "@conference-kit/ui-vue";

const participants = [
  {
    id: "me",
    label: "You",
    stream: null,
    connectionState: "connected",
    isLocal: true,
  },
];
const status = { signaling: "open", media: "ready", data: "ready" };
</script>

<template>
  <div class="space-y-4">
    <ConnectionBadge :status="status" />
    <ParticipantGrid :participants="participants" />
  </div>
</template>
```

## Build

```bash
npm run build
```
