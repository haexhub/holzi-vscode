<!-- src/webview/components/MessageList.vue -->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Message } from '../App.vue'
import ToolRow from './ToolRow.vue'

const props = defineProps<{
  messages: Message[]
}>()

const emit = defineEmits<{
  toolConfirm: [id: string, allowed: boolean]
}>()

const listEl = ref<HTMLElement>()

watch(
  () => props.messages,
  async () => {
    await nextTick()
    listEl.value?.lastElementChild?.scrollIntoView({ block: 'end' })
  },
  { deep: true }
)
</script>

<template>
  <div
    ref="listEl"
    role="log"
    aria-live="polite"
    class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
  >
    <template v-for="(msg, i) in messages" :key="i">
      <div
        v-if="msg.kind === 'user'"
        class="self-end max-w-[85%] bg-[var(--vscode-editor-inactiveSelectionBackground)] px-2.5 py-2 rounded leading-relaxed whitespace-pre-wrap break-words"
      >{{ msg.text }}</div>

      <div
        v-else-if="msg.kind === 'assistant'"
        class="max-w-full leading-relaxed whitespace-pre-wrap break-words"
      >{{ msg.text }}</div>

      <div
        v-else-if="msg.kind === 'error'"
        class="leading-relaxed text-[var(--vscode-errorForeground)]"
      >{{ msg.text }}</div>

      <ToolRow
        v-else-if="msg.kind === 'tool'"
        v-bind="msg"
        @confirm="(id, allowed) => emit('toolConfirm', id, allowed)"
      />
    </template>
  </div>
</template>
