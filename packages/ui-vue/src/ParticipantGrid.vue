<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <ParticipantTile v-for="p in participants" :key="p.id" :participant="p" />
    <div v-if="!participants.length" class="text-slate-400 text-sm">
      Waiting for participants…
    </div>
  </div>
</template>

<script setup lang="ts">
import ParticipantTile from "./ParticipantTile.vue";

type Participant = {
  id: string;
  label?: string;
  stream?: MediaStream | null;
  connectionState?: RTCPeerConnectionState;
  mutedAudio?: boolean;
  mutedVideo?: boolean;
  isLocal?: boolean;
};

defineProps<{ participants: Participant[] }>();
</script>
