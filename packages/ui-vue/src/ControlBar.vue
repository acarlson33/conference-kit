<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
  >
    <div class="flex flex-wrap gap-2">
      <button class="btn-join" :disabled="joined" @click="$emit('join')">
        <VideoIcon class="h-4 w-4" /> Join
      </button>
      <button class="btn-ghost" :disabled="!joined" @click="$emit('leave')">
        <PhoneIcon class="h-4 w-4" /> Leave
      </button>
      <button
        class="btn-ghost"
        :disabled="!joined || !mediaReady"
        @click="$emit('toggle-audio')"
      >
        <MicIcon class="h-4 w-4" /> {{ audioMuted ? "Unmute" : "Mute" }}
      </button>
      <button
        class="btn-ghost"
        :disabled="!joined || !mediaReady"
        @click="$emit('toggle-video')"
      >
        <VideoIcon class="h-4 w-4" />
        {{ videoMuted ? "Start video" : "Stop video" }}
      </button>
      <button
        class="btn-ghost"
        :disabled="!joined"
        @click="$emit('toggle-screen')"
      >
        <ScreenIcon class="h-4 w-4" />
        {{ screenSharing ? "Stop share" : "Share screen" }}
      </button>
      <button class="btn-ghost" @click="$emit('reset')">
        <ChatIcon class="h-4 w-4" /> Reset
      </button>
    </div>
    <div class="flex items-center gap-2">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatIcon, MicIcon, PhoneIcon, ScreenIcon, VideoIcon } from "./icons";

defineProps<{
  joined?: boolean;
  mediaReady?: boolean;
  audioMuted?: boolean;
  videoMuted?: boolean;
  screenSharing?: boolean;
}>();

defineEmits([
  "join",
  "leave",
  "toggle-audio",
  "toggle-video",
  "toggle-screen",
  "reset",
]);
</script>

<style scoped>
.btn-join {
  @apply inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border border-emerald-500 text-emerald-100 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50;
}
.btn-ghost {
  @apply inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border border-slate-700 text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-50;
}
</style>
