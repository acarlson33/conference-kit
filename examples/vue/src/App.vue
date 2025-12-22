<template>
  <div class="page">
    <header class="top">
      <div>
        <h1>Vue Mesh Room</h1>
        <p class="muted">
          Join a room, see everyone in the roster, and stream media to peers.
        </p>
      </div>
      <div class="badges">
        <span class="badge">Peer {{ peerId }}</span>
        <span class="badge">Room {{ room }}</span>
        <span class="badge" :class="signalClass"
          >Signal {{ mesh.signalingStatus }}</span
        >
      </div>
    </header>

    <section class="panel">
      <div class="field">
        <label>Signaling URL</label>
        <input v-model="signalingUrl" />
        <div class="hint">
          <button class="ghost" @click="useLocalHost">Use this host</button>
          <small>Default: ws(s)://&lt;host&gt;:8787</small>
        </div>
      </div>

      <div class="grid two">
        <div class="field">
          <label>Your ID</label>
          <div class="pill">{{ peerId }}</div>
        </div>
        <div class="field">
          <label>Room</label>
          <input v-model="room" />
        </div>
      </div>

      <div class="chips">
        <label><input type="checkbox" v-model="includeAudio" /> Audio</label>
        <label><input type="checkbox" v-model="includeVideo" /> Video</label>
        <span class="badge">{{ modeLabel }}</span>
      </div>

      <div class="actions">
        <button
          class="primary"
          :disabled="joined || !room.trim()"
          @click="join"
        >
          Join Room
        </button>
        <button class="ghost" :disabled="!joined" @click="leave">Leave</button>
        <button class="ghost" @click="mesh.requestStream">Request Media</button>
        <button class="ghost" @click="mesh.stopStream">Release Media</button>
      </div>
    </section>

    <section class="panel">
      <h3>Roster ({{ mesh.roster.length }})</h3>
      <div class="list" v-if="mesh.roster.length">
        <div class="list-item" v-for="id in mesh.roster" :key="id">
          <span>{{ id }}</span>
          <span class="badge" :class="{ success: id === peerId }">{{
            id === peerId ? "You" : "Peer"
          }}</span>
        </div>
      </div>
      <p class="muted" v-else>No peers yet. Join from another tab.</p>
    </section>

    <section class="panel">
      <div class="row">
        <h3>Participants ({{ tiles.length }})</h3>
        <span class="badge"
          >Media:
          {{
            mesh.ready ? "ready" : mesh.requesting ? "requesting" : "off"
          }}</span
        >
      </div>
      <div class="tiles">
        <div class="tile" v-for="tile in tiles" :key="tile.id">
          <div class="tile-head">
            <strong>{{ tile.label }}</strong>
            <span class="badge">{{ tile.connection }}</span>
          </div>
          <video
            class="video"
            :muted="tile.id === peerId"
            autoplay
            playsinline
            ref="(el) => bindVideo(el, tile.stream)"
          ></video>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3>Connection tips</h3>
      <ul>
        <li>
          Start signaling: <code>bun run dev:signal</code> (default
          ws://host:8787)
        </li>
        <li>
          If the Signal badge isn’t green, the socket isn’t reachable
          (host/port/firewall).
        </li>
        <li>
          Use wss:// when serving the page over HTTPS, or run both over HTTP for
          LAN testing.
        </li>
        <li>
          Media capture often requires a secure origin; data-only works on HTTP.
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useMeshRoom } from "@conference-kit/vue";

const randomId = () => Math.random().toString(36).slice(2, 8);
const peerId = randomId();
const room = ref("lobby");
const signalingUrl = ref(deriveDefaultUrl());
const includeAudio = ref(true);
const includeVideo = ref(true);
const joined = ref(false);

const mesh = useMeshRoom({
  peerId,
  room: room.value,
  signalingUrl: signalingUrl.value,
  mediaConstraints: computed(() => ({
    audio: includeAudio.value,
    video: includeVideo.value,
  })).value,
  autoReconnect: true,
});

const modeLabel = computed(() => {
  if (includeAudio.value && includeVideo.value) return "AV";
  if (includeAudio.value) return "Audio";
  if (includeVideo.value) return "Video";
  return "Data";
});

const tiles = computed(() => {
  const remotes = mesh.participants.map((p) => ({
    id: p.id,
    stream: p.remoteStream,
    connection: p.connectionState,
  }));
  return [
    {
      id: peerId,
      label: "You",
      stream: mesh.localStream,
      connection: mesh.ready ? "connected" : "new",
    },
    ...remotes.map((p) => ({
      id: p.id,
      label: p.id,
      stream: p.stream,
      connection: p.connection,
    })),
  ];
});

function deriveDefaultUrl() {
  if (typeof window === "undefined") return "ws://localhost:8787";
  const envHost = (import.meta as any).env?.VITE_SIGNAL_HOST as
    | string
    | undefined;
  const envPort = (import.meta as any).env?.VITE_SIGNAL_PORT as
    | string
    | undefined;
  if (envHost) {
    const port = envPort ?? "8787";
    const scheme = envHost.startsWith("ws") ? "" : "ws://";
    return `${scheme}${envHost}${envHost.includes(":") ? "" : `:${port}`}`;
  }
  const isSecure = window.location.protocol === "https:";
  const host = window.location.hostname || "localhost";
  const port = envPort ?? "8787";
  return `${isSecure ? "wss" : "ws"}://${host}:${port}`;
}

function deriveLocalUrl() {
  if (typeof window === "undefined") return signalingUrl.value;
  const isSecure = window.location.protocol === "https:";
  const host = window.location.hostname || "localhost";
  return `${isSecure ? "wss" : "ws"}://${host}:8787`;
}

function useLocalHost() {
  signalingUrl.value = deriveLocalUrl();
}

async function join() {
  joined.value = true;
  await mesh.requestStream();
}

function leave() {
  joined.value = false;
  mesh.leave();
}

function bindVideo(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
}

const signalClass = computed(() =>
  mesh.signalingStatus === "open" ? "success" : "warn"
);

onBeforeUnmount(() => mesh.leave());
</script>

<style scoped>
:global(body) {
  margin: 0;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 16px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.muted {
  color: #94a3b8;
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  border: 1px solid #1f2937;
  background: #111827;
  color: #e2e8f0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.badge.success {
  border-color: #16a34a;
  color: #bbf7d0;
}

.badge.warn {
  border-color: #f59e0b;
  color: #fed7aa;
}

.panel {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field label {
  color: #94a3b8;
  font-size: 13px;
}

.field input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0b1220;
  color: #e2e8f0;
}

.hint {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  color: #94a3b8;
  font-size: 12px;
}

.grid.two {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.chips {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.primary {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #2563eb;
  color: #e2e8f0;
  font-weight: 600;
  cursor: pointer;
}

.ghost {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #1f2937;
  background: #0b1220;
  color: #cbd5e1;
  cursor: pointer;
}

.pill {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0b1220;
  color: #e2e8f0;
}

.list {
  display: grid;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #1f2937;
  background: #0b1220;
}

.tiles {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.tile {
  background: #0b1220;
  border: 1px solid #1f2937;
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.tile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.video {
  width: 100%;
  min-height: 140px;
  background: #030712;
  border-radius: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

ul {
  margin: 0;
  padding-left: 18px;
  color: #94a3b8;
  line-height: 1.5;
}

a,
code {
  color: #e2e8f0;
}
</style>
