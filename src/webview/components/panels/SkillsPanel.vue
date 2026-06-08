<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ skills: string[] }>()
const emit = defineEmits<{ 'update:skills': [value: string[]]; back: [] }>()

const input = ref('')

function addSkill() {
  const name = input.value.trim()
  if (name && !props.skills.includes(name)) {
    emit('update:skills', [...props.skills, name])
    input.value = ''
  }
}

function removeSkill(name: string) {
  emit('update:skills', props.skills.filter((s) => s !== name))
}
</script>

<template>
  <div class="flex flex-col">
    <button
      class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left"
      @click="emit('back')"
    >
      <span>←</span>
      <span class="font-medium text-[var(--vscode-foreground)]">Skills</span>
    </button>
    <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />
    <div class="px-3 py-2 flex flex-wrap gap-1">
      <span
        v-for="skill in skills"
        :key="skill"
        class="inline-flex items-center gap-1 bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded px-1.5 py-0.5 text-xs"
      >
        {{ skill }}
        <button
          class="bg-transparent border-none text-inherit cursor-pointer p-0 text-[11px] opacity-70 hover:opacity-100"
          :aria-label="`Remove skill ${skill}`"
          @click="removeSkill(skill)"
        >✕</button>
      </span>
    </div>
    <div class="px-3 pb-2">
      <input
        v-model="input"
        type="text"
        placeholder="Skill name + Enter…"
        autocomplete="off"
        class="w-full bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border,var(--vscode-panel-border))] rounded px-2 py-1 text-sm outline-none focus:border-[var(--vscode-focusBorder)]"
        @keydown.enter.prevent="addSkill"
      />
    </div>
  </div>
</template>
