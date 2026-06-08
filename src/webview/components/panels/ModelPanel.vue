<script setup lang="ts">
const props = defineProps<{
  models: Array<{ id: string; display_name: string }>
  selectedModel: string
}>()
const emit = defineEmits<{
  'update:selectedModel': [value: string]
  back: []
}>()
</script>

<template>
  <div class="flex flex-col">
    <button
      class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      @click="emit('back')"
    >
      <span>←</span>
      <span class="font-medium text-[var(--vscode-foreground)]">Model</span>
    </button>
    <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />
    <button
      v-for="m in models"
      :key="m.id"
      class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      :class="m.id === selectedModel ? 'text-[var(--vscode-foreground)]' : 'text-[var(--vscode-descriptionForeground)]'"
      @click="emit('update:selectedModel', m.id); emit('back')"
    >
      <span class="w-3 text-xs">{{ m.id === selectedModel ? '●' : '' }}</span>
      {{ m.display_name }}
    </button>
  </div>
</template>
