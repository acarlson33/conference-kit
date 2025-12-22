<template>
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 grid gap-2">
    <div class="flex items-center justify-between gap-2 text-sm text-slate-200">
      <div class="font-semibold truncate">
        {{ participant.label ?? participant.id }}
      </div>
      <span class="text-xs text-slate-400">{{
        participant.connectionState ?? "new"
      }}</span>
    </div>
    <video
      class="w-full aspect-video rounded-lg bg-slate-950"
      :muted="participant.isLocal"
      autoplay
      playsinline
      ref="bindVideo"
    ></video>
    <div class="flex items-center gap-3 text-xs text-slate-400">
      <span
        :class="participant.mutedAudio ? 'text-amber-400' : 'text-emerald-300'"
      >
        {{ participant.mutedAudio ? "Audio muted" : "Audio on" }}
      </span>
      <span
        :class="participant.mutedVideo ? 'text-amber-400' : 'text-emerald-300'"
      >
        {{ participant.mutedVideo ? "Video muted" : "Video on" }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
type Participant = {
  id: string;
  label?: string;
  stream?: MediaStream | null;
  connectionState?: RTCPeerConnectionState;
  mutedAudio?: boolean;
  mutedVideo?: boolean;
  isLocal?: boolean;
};

const props = defineProps<{ participant: Participant }>();

function bindVideo(el: HTMLVideoElement | null) {
  if (!el) return;
  if (props.participant.stream && el.srcObject !== props.participant.stream) {
    el.srcObject = props.participant.stream;
  }
  if (!props.participant.stream && el.srcObject) {
    el.srcObject = null;
  }
}
</script>
