<!-- src/webview/components/InputArea.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import SlashMenu from './SlashMenu.vue'

const props = defineProps<{
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  models: Array<{ id: string; display_name: string }>
  selectedModel: string
  permissionMode: string
  effort: string
  thinking: boolean
  activeSkills: string[]
  sending: boolean
  filePickedName: string
  filePickedContent: string
}>()

const emit = defineEmits<{
  'update:selectedModel': [value: string]
  'update:permissionMode': [value: string]
  'update:effort': [value: string]
  'update:thinking': [value: boolean]
  'update:activeSkills': [value: string[]]
  send: [content: string, attachedFiles: Array<{ name: string; content: string }>]
  pickFile: []
}>()

const inputText = ref('')
const menuOpen = ref(false)
const attachedFiles = ref<Array<{ name: string; content: string }>>([])
const inputEl = ref<HTMLTextAreaElement>()

watch(
  () => props.filePickedName,
  (name) => {
    if (name && props.filePickedContent) {
      attachedFiles.value.push({ name, content: props.filePickedContent })
    }
  }
)

function autoGrow() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 200) + 'px'
}

function doSend() {
  const content = inputText.value.trim()
  if (!content || props.sending) return
  emit('send', content, [...attachedFiles.value])
  inputText.value = ''
  attachedFiles.value = []
  if (inputEl.value) inputEl.value.style.height = 'auto'
}

function removeFile(idx: number) {
  attachedFiles.value.splice(idx, 1)
}

defineExpose({ closeMenu: () => { menuOpen.value = false } })

const modeLabels: Record<string, string> = {
  plan: 'Plan',
  ask: 'Ask',
  auto_edit: 'Auto Edit',
  auto: 'Auto',
}
</script>

<template>
  <div class="relative shrink-0 px-2.5 pb-2.5">
    <SlashMenu
      v-if="menuOpen"
      :models="models"
      :selected-model="selectedModel"
      :permission-mode="permissionMode"
      :effort="effort"
      :thinking="thinking"
      :active-skills="activeSkills"
      @update:selected-model="emit('update:selectedModel', $event)"
      @update:permission-mode="emit('update:permissionMode', $event)"
      @update:effort="emit('update:effort', $event)"
      @update:thinking="emit('update:thinking', $event)"
      @update:active-skills="emit('update:activeSkills', $event)"
      @attach-file="emit('pickFile')"
      @close="menuOpen = false"
    />

    <div
      class="border border-[var(--vscode-input-border,var(--vscode-panel-border))] rounded-lg bg-[var(--vscode-input-background)] flex flex-col focus-within:border-[var(--vscode-focusBorder)]"
    >
      <!-- Attached files chips -->
      <div v-if="attachedFiles.length" class="flex flex-wrap gap-1 px-3 pt-2">
        <span
          v-for="(f, i) in attachedFiles"
          :key="i"
          class="inline-flex items-center gap-1 bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded px-1.5 py-0.5 text-xs"
        >
          📎 {{ f.name }}
          <button
            class="bg-transparent border-none text-inherit cursor-pointer p-0 text-[11px] opacity-70 hover:opacity-100"
            @click="removeFile(i)"
          >✕</button>
        </span>
      </div>

      <textarea
        ref="inputEl"
        v-model="inputText"
        rows="1"
        placeholder="Message Holzi…"
        aria-label="Message input"
        class="w-full bg-transparent text-[var(--vscode-input-foreground)] border-none outline-none px-3 pt-2.5 pb-1.5 font-[var(--vscode-font-family)] text-[var(--vscode-font-size)] resize-none max-h-48 overflow-y-auto leading-relaxed"
        @input="autoGrow"
        @keydown.enter.exact.prevent="doSend"
        @click="menuOpen = false"
      />

      <div class="flex items-center justify-between px-2 py-1 border-t border-[var(--vscode-panel-border)]">
        <!-- Left: attach + slash -->
        <div class="flex items-center gap-0.5">
          <button
            title="Attach file"
            aria-label="Attach file"
            class="w-7 h-7 flex items-center justify-center rounded-full bg-transparent border border-[var(--vscode-panel-border)] text-[var(--vscode-descriptionForeground)] cursor-pointer text-xl font-light hover:bg-[var(--vscode-toolbar-hoverBackground)] hover:text-[var(--vscode-foreground)]"
            @click="emit('pickFile')"
          >+</button>
          <button
            title="Options"
            aria-label="Open options"
            class="w-7 h-7 flex items-center justify-center rounded-full bg-transparent border-none text-[var(--vscode-descriptionForeground)] cursor-pointer text-lg hover:bg-[var(--vscode-toolbar-hoverBackground)] hover:text-[var(--vscode-foreground)]"
            @click.stop="menuOpen = !menuOpen"
          >/</button>
        </div>

        <!-- Right: status dot + mode label + send -->
        <div class="flex items-center gap-0.5">
          <span
            class="w-2 h-2 rounded-full mx-1 shrink-0"
            :class="{
              'bg-[var(--vscode-testing-iconPassed)]': connectionStatus === 'connected',
              'bg-[var(--vscode-charts-yellow)]': connectionStatus === 'connecting',
              'bg-[var(--vscode-testing-iconFailed)]': connectionStatus === 'disconnected',
            }"
            :title="connectionStatus"
            aria-label="Connection status"
          />
          <button
            class="text-[0.85em] px-2.5 py-1 border border-[var(--vscode-panel-border)] rounded bg-transparent text-[var(--vscode-descriptionForeground)] cursor-pointer hover:bg-[var(--vscode-toolbar-hoverBackground)] hover:text-[var(--vscode-foreground)]"
            @click.stop="menuOpen = !menuOpen"
          >{{ modeLabels[permissionMode] ?? permissionMode }}</button>
          <button
            title="Send (Enter)"
            aria-label="Send message"
            :disabled="sending"
            class="w-7 h-7 min-w-7 min-h-7 flex items-center justify-center rounded-full bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] border-none cursor-pointer text-base hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-40 disabled:cursor-default"
            @click="doSend"
          >➤</button>
        </div>
      </div>
    </div>
  </div>
</template>
