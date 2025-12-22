<template>
  <div class="flex flex-wrap gap-2 text-sm">
    <span
      :class="[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
        signalTone,
      ]"
    >
      <SignalIcon class="h-4 w-4" /> Signal {{ status.signaling ?? "idle" }}
    </span>
    <span
      :class="[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
        mediaTone,
      ]"
    >
      <WifiOffIcon class="h-4 w-4" /> Media {{ status.media ?? "off" }}
    </span>
    <span
      :class="[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
        dataTone,
      ]"
    >
      <SignalIcon class="h-4 w-4" /> Data {{ status.data ?? "idle" }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { SignalIcon, WifiOffIcon } from "./icons";

type Status = {
  signaling?: "idle" | "connecting" | "open" | "closed";
  media?: "off" | "requesting" | "ready";
  data?: "idle" | "ready";
};

const props = defineProps<{ status: Status }>();

const signalTone = computed(() =>
  props.status.signaling === "open"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800"
);
const mediaTone = computed(() => {
  if (props.status.media === "ready") return "bg-emerald-100 text-emerald-800";
  if (props.status.media === "requesting") return "bg-amber-100 text-amber-800";
  return "bg-slate-200 text-slate-700";
});
const dataTone = computed(() =>
  props.status.data === "ready"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700"
);
</script>
