<!-- src/webview/components/SlashMenu.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Switch } from './ui/switch'
import ModelPanel from './panels/ModelPanel.vue'
import ModePanel from './panels/ModePanel.vue'
import EffortPanel from './panels/EffortPanel.vue'
import SkillsPanel from './panels/SkillsPanel.vue'

const props = defineProps<{
  models: Array<{ id: string; display_name: string }>
  selectedModel: string
  permissionMode: string
  effort: string
  thinking: boolean
  activeSkills: string[]
}>()

const emit = defineEmits<{
  'update:selectedModel': [value: string]
  'update:permissionMode': [value: string]
  'update:effort': [value: string]
  'update:thinking': [value: boolean]
  'update:activeSkills': [value: string[]]
  attachFile: []
  close: []
}>()

type Panel = 'model' | 'mode' | 'effort' | 'skills' | null
const currentPanel = ref<Panel>(null)

function modelLabel() {
  return props.models.find((m) => m.id === props.selectedModel)?.display_name ?? props.selectedModel
}

const modeLabels: Record<string, string> = {
  plan: 'Plan',
  ask: 'Ask',
  auto_edit: 'Auto Edit',
  auto: 'Auto',
}
</script>

<template>
  <div
    class="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-lg border border-[var(--vscode-widget-border,var(--vscode-panel-border))] bg-[var(--vscode-editorWidget-background,var(--vscode-editor-background))] shadow-xl py-1.5 overflow-hidden"
    @click.stop
  >
    <Transition name="slide" mode="out-in">
      <ModelPanel
        v-if="currentPanel === 'model'"
        key="model"
        :models="models"
        :selected-model="selectedModel"
        @update:selected-model="emit('update:selectedModel', $event)"
        @back="currentPanel = null"
      />
      <ModePanel
        v-else-if="currentPanel === 'mode'"
        key="mode"
        :mode="permissionMode"
        @update:mode="emit('update:permissionMode', $event)"
        @back="currentPanel = null"
      />
      <EffortPanel
        v-else-if="currentPanel === 'effort'"
        key="effort"
        :effort="effort"
        @update:effort="emit('update:effort', $event)"
        @back="currentPanel = null"
      />
      <SkillsPanel
        v-else-if="currentPanel === 'skills'"
        key="skills"
        :skills="activeSkills"
        @update:skills="emit('update:activeSkills', $event)"
        @back="currentPanel = null"
      />

      <!-- Main menu -->
      <div v-else key="main" class="flex flex-col">
        <!-- Switch model -->
        <button
          class="flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left text-[var(--vscode-foreground)]"
          @click="currentPanel = 'model'"
        >
          <span>Switch model…</span>
          <div class="flex items-center gap-1.5 text-[var(--vscode-descriptionForeground)]">
            <span class="text-xs">{{ modelLabel() }}</span>
            <span>›</span>
          </div>
        </button>

        <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />

        <!-- Mode -->
        <button
          class="flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left text-[var(--vscode-foreground)]"
          @click="currentPanel = 'mode'"
        >
          <span>Mode</span>
          <div class="flex items-center gap-1.5 text-[var(--vscode-descriptionForeground)]">
            <span class="text-xs">{{ modeLabels[permissionMode] ?? permissionMode }}</span>
            <span>›</span>
          </div>
        </button>

        <!-- Effort -->
        <button
          class="flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left text-[var(--vscode-foreground)]"
          @click="currentPanel = 'effort'"
        >
          <span>Effort</span>
          <div class="flex items-center gap-1.5 text-[var(--vscode-descriptionForeground)]">
            <span class="text-xs capitalize">{{ effort }}</span>
            <span>›</span>
          </div>
        </button>

        <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />

        <!-- Thinking toggle -->
        <div class="flex items-center justify-between px-3 py-2 text-sm text-[var(--vscode-foreground)]">
          <span>Thinking</span>
          <Switch
            :checked="thinking"
            @update:checked="emit('update:thinking', $event)"
          />
        </div>

        <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />

        <!-- Skills -->
        <button
          class="flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left text-[var(--vscode-foreground)]"
          @click="currentPanel = 'skills'"
        >
          <span>Skills</span>
          <div class="flex items-center gap-1.5 text-[var(--vscode-descriptionForeground)]">
            <span v-if="activeSkills.length" class="text-xs">{{ activeSkills.length }} active</span>
            <span>›</span>
          </div>
        </button>

        <div class="h-px bg-[var(--vscode-panel-border)] mx-3" />

        <!-- Attach file -->
        <button
          class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-none bg-transparent w-full text-left text-[var(--vscode-foreground)]"
          @click="emit('attachFile'); emit('close')"
        >
          📎 Attach file…
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
