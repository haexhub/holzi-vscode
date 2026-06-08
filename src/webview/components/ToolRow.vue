<!-- src/webview/components/ToolRow.vue -->
<script setup lang="ts">
import { ref } from 'vue'

interface ToolMessage {
  kind: 'tool'
  id: string
  name: string
  params: Record<string, unknown>
  result?: string
  denied?: boolean
  diff?: string
  needsConfirm?: boolean
}

const props = defineProps<ToolMessage>()

const emit = defineEmits<{
  confirm: [id: string, allowed: boolean]
}>()

const expanded = ref(props.needsConfirm ?? false)

function escHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderDiff(patch: string): string {
  return patch
    .split('\n')
    .map((line) => {
      const esc = escHtml(line)
      if (line.startsWith('+') && !line.startsWith('+++'))
        return `<span class="text-[var(--vscode-gitDecoration-addedResourceForeground)]">${esc}</span>`
      if (line.startsWith('-') && !line.startsWith('---'))
        return `<span class="text-[var(--vscode-gitDecoration-deletedResourceForeground)]">${esc}</span>`
      return esc
    })
    .join('\n')
}

const paramStr = Object.entries(props.params)
  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
  .join(' ')
</script>

<template>
  <div class="flex flex-col gap-1 border-l-2 border-[var(--vscode-panel-border)] pl-2.5 text-[0.9em]">
    <div
      class="flex items-center gap-1.5 cursor-pointer select-none text-[var(--vscode-descriptionForeground)]"
      @click="expanded = !expanded"
    >
      <span class="text-[10px]">
        {{ result !== undefined ? (denied ? '✗' : '✓') : '●' }}
      </span>
      <span class="font-semibold text-[var(--vscode-foreground)]">{{ name }}</span>
      <span class="overflow-hidden text-ellipsis whitespace-nowrap flex-1">{{ paramStr }}</span>
    </div>

    <div v-if="expanded" class="mt-1">
      <template v-if="needsConfirm">
        <pre
          class="font-mono text-[0.85em] whitespace-pre overflow-x-auto max-h-48 bg-[var(--vscode-textCodeBlock-background)] p-2 mb-2 rounded"
          v-html="diff ? renderDiff(diff) : escHtml(JSON.stringify(params, null, 2))"
        />
        <div class="flex gap-2">
          <button
            class="px-3 py-1 text-xs bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded hover:bg-[var(--vscode-button-hoverBackground)] cursor-pointer border-none"
            @click="emit('confirm', id, true)"
          >Allow</button>
          <button
            class="px-3 py-1 text-xs bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] rounded cursor-pointer border-none"
            @click="emit('confirm', id, false)"
          >Deny</button>
        </div>
      </template>

      <pre
        v-else-if="result"
        class="font-mono text-[0.85em] whitespace-pre-wrap break-all"
      >{{ result }}</pre>
    </div>
  </div>
</template>
