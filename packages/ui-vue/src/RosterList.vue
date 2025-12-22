<template>
  <div class="grid gap-2">
    <div v-if="!roster.length" class="text-slate-400 text-sm">
      No peers joined yet
    </div>
    <div
      v-for="entry in roster"
      :key="entry.id"
      :class="[
        'flex items-center justify-between rounded-lg border px-3 py-2',
        entry.id === selfId
          ? 'bg-emerald-100 border-emerald-200 text-emerald-900'
          : 'bg-slate-800 border-slate-700 text-slate-200',
      ]"
    >
      <span class="font-semibold truncate">{{ entry.label ?? entry.id }}</span>
      <span class="text-xs opacity-80">{{
        entry.id === selfId ? "You" : entry.status ?? "Peer"
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
type RosterEntry = { id: string; label?: string; status?: string };

defineProps<{ roster: RosterEntry[]; selfId?: string }>();
</script>
