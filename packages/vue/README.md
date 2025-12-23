# @conference-kit/vue

Vue 3 composition utilities and signaling helper for building peer-to-peer mesh calls.

## Install

```bash
npm install @conference-kit/vue
```

Peer deps: Vue 3.4+.

## What it provides

- `useMeshRoom(options)`: manage local media, roster, participants, and signaling for a mesh room.
- `SignalingClient`: minimal WebSocket client for presence/signal/broadcast/control messages.

`options` include `peerId`, `room`, `signalingUrl`, `mediaConstraints`, `rtcConfig`, `trickle`, `autoReconnect`, and feature toggles (e.g., `enableDataChannel`).

## Quick example

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useMeshRoom } from "@conference-kit/vue";

const peerId = "peer-1";
const mesh = useMeshRoom({
  peerId,
  room: "lobby",
  signalingUrl: "ws://localhost:8787",
});

onMounted(() => mesh.requestStream());
onUnmounted(() => mesh.leave());

const peers = computed(() => mesh.participants.value);
</script>

<template>
  <div>
    <button @click="mesh.requestStream">Request media</button>
    <div v-for="p in peers" :key="p.id">
      {{ p.id }} ({{ p.connectionState }})
    </div>
  </div>
</template>
```

## Signaling

`SignalingClient` emits `presence`, `signal`, `broadcast`, and `control` events matching the server in `@conference-kit/signaling-server`. Use it directly if you need a custom flow outside `useMeshRoom`.

## Build

```bash
npm run build
```
