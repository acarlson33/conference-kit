<template>
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 grid gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-slate-100 font-semibold">
        <ChatIcon class="h-5 w-5" /> Data Channel
      </div>
      <span
        :class="[
          'text-xs px-2 py-1 rounded-full',
          ready
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-slate-200 text-slate-700',
        ]"
      >
        {{ ready ? "Open" : "Closed" }}
      </span>
    </div>
    <form class="flex gap-2" @submit.prevent="submit">
      <input
        class="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
        v-model="text"
        placeholder="Message"
      />
      <button
        type="submit"
        :disabled="!ready"
        class="px-3 py-2 rounded-lg bg-emerald-600 text-slate-50 font-semibold disabled:opacity-50"
      >
        Send
      </button>
    </form>
    <div class="max-h-64 overflow-auto grid gap-2">
      <div v-if="!messages.length" class="text-slate-400 text-sm">
        No messages yet
      </div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="[
          'flex items-center justify-between rounded-lg px-3 py-2 border',
          msg.direction === 'in'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-emerald-50 border-emerald-200',
        ]"
      >
        <span class="text-sm text-slate-100">{{ msg.text }}</span>
        <span class="text-xs text-slate-500">{{
          msg.direction === "in" ? "In" : "Out"
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ChatIcon } from "./icons";

type ChatMessage = { id: string; direction: "in" | "out"; text: string };

const props = defineProps<{ messages: ChatMessage[]; ready: boolean }>();
const emit = defineEmits<{ send: [text: string] }>();

const text = ref("ping");

function submit() {
  if (!text.value.trim()) return;
  emit("send", text.value.trim());
  text.value = "";
}
</script>
