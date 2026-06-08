<script setup lang="ts">
const MODES = [
  { value: 'plan', label: 'Plan' },
  { value: 'ask', label: 'Ask' },
  { value: 'auto_edit', label: 'Auto Edit' },
  { value: 'auto', label: 'Auto' },
]
const props = defineProps<{ mode: string }>()
const emit = defineEmits<{ 'update:mode': [value: string]; back: [] }>()
</script>

<template>
  <div class="flex flex-col">
    <button
      class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      @click="emit('back')"
    >
      <span>←</span>
      <span class="font-medium text-[var(--vscode-foreground)]">Mode</span>
    </button>
    <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />
    <button
      v-for="m in MODES"
      :key="m.value"
      class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      :class="m.value === mode ? 'text-[var(--vscode-foreground)]' : 'text-[var(--vscode-descriptionForeground)]'"
      @click="emit('update:mode', m.value); emit('back')"
    >
      <span class="w-3 text-xs">{{ m.value === mode ? '●' : '' }}</span>
      {{ m.label }}
    </button>
  </div>
</template>
