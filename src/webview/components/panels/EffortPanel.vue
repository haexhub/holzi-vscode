<script setup lang="ts">
const EFFORTS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
]
const props = defineProps<{ effort: string }>()
const emit = defineEmits<{ 'update:effort': [value: string]; back: [] }>()
</script>

<template>
  <div class="flex flex-col">
    <button
      class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      @click="emit('back')"
    >
      <span>←</span>
      <span class="font-medium text-[var(--vscode-foreground)]">Effort</span>
    </button>
    <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />
    <button
      v-for="e in EFFORTS"
      :key="e.value"
      class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      :class="e.value === effort ? 'text-[var(--vscode-foreground)]' : 'text-[var(--vscode-descriptionForeground)]'"
      @click="emit('update:effort', e.value); emit('back')"
    >
      <span class="w-3 text-xs">{{ e.value === effort ? '●' : '' }}</span>
      {{ e.label }}
    </button>
  </div>
</template>
