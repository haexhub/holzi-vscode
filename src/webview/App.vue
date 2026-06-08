<!-- src/webview/App.vue -->
<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'

type ToExtension =
  | { type: 'send_message'; content: string; context: Record<string, string | undefined> }
  | { type: 'set_permission_mode'; mode: string }
  | { type: 'tool_confirm_response'; id: string; allowed: boolean }
  | { type: 'start_session'; model: string; skills: string[] }
  | { type: 'ready' }
  | { type: 'pick_file' }

type FromExtension =
  | { type: 'stream_chunk'; delta: string }
  | { type: 'stream_done' }
  | { type: 'status'; connected: boolean; connecting: boolean }
  | { type: 'models'; list: Array<{ id: string; display_name: string }> }
  | { type: 'tool_call_display'; id: string; name: string; params: Record<string, unknown> }
  | { type: 'tool_confirm_request'; id: string; name: string; params: Record<string, unknown>; diff?: string }
  | { type: 'tool_result_display'; id: string; result: string; denied: boolean }
  | { type: 'permission_mode_ack'; mode: string }
  | { type: 'file_picked'; name: string; content: string }
  | { type: 'error'; message: string }

export type Message =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'tool'; id: string; name: string; params: Record<string, unknown>; result?: string; denied?: boolean; diff?: string; needsConfirm?: boolean }

const vscode = inject<{ postMessage(msg: ToExtension): void }>('vscode')!

const messages = ref<Message[]>([])
const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected')
const models = ref<Array<{ id: string; display_name: string }>>([])
const sessionStarted = ref(false)
const sending = ref(false)
const permissionMode = ref('ask')
const effort = ref('medium')
const thinking = ref(false)
const activeSkills = ref<string[]>([])
const selectedModel = ref('')
const filePickedName = ref('')
const filePickedContent = ref('')

function post(msg: ToExtension) {
  vscode.postMessage(msg)
}

function startSession() {
  post({ type: 'start_session', model: selectedModel.value, skills: [...activeSkills.value] })
}

function send(content: string, attachedFiles: Array<{ name: string; content: string }>) {
  if (!content || sending.value) return
  sending.value = true

  const context: Record<string, string> = {
    __effort: effort.value,
    __thinking: String(thinking.value),
  }
  for (const f of attachedFiles) {
    context[`file:${f.name}`] = f.content
  }

  messages.value.push({ kind: 'user', text: content })
  messages.value.push({ kind: 'assistant', text: '' })
  post({ type: 'send_message', content, context })
}

function onPermissionModeChange(mode: string) {
  permissionMode.value = mode
  post({ type: 'set_permission_mode', mode })
}

function onToolConfirm(id: string, allowed: boolean) {
  post({ type: 'tool_confirm_response', id, allowed })
}

function onPickFile() {
  post({ type: 'pick_file' })
}

function inputAreaCloseMenu() {
  // will be wired in Task 14/15
}

window.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data as FromExtension

  if (msg.type === 'status') {
    connectionStatus.value = msg.connecting ? 'connecting' : msg.connected ? 'connected' : 'disconnected'
    return
  }

  if (msg.type === 'models') {
    models.value = msg.list
    if (msg.list.length > 0) {
      selectedModel.value = msg.list[0].id
      if (!sessionStarted.value) {
        startSession()
        sessionStarted.value = true
      }
    }
    return
  }

  if (msg.type === 'stream_chunk') {
    const last = messages.value[messages.value.length - 1]
    if (last?.kind === 'assistant') last.text += msg.delta
    return
  }

  if (msg.type === 'stream_done') {
    sending.value = false
    return
  }

  if (msg.type === 'tool_call_display') {
    messages.value.push({ kind: 'tool', id: msg.id, name: msg.name, params: msg.params })
    return
  }

  if (msg.type === 'tool_confirm_request') {
    messages.value.push({
      kind: 'tool',
      id: msg.id,
      name: msg.name,
      params: msg.params,
      diff: msg.diff,
      needsConfirm: true,
    })
    return
  }

  if (msg.type === 'tool_result_display') {
    const tool = messages.value.find(
      (m): m is Extract<Message, { kind: 'tool' }> => m.kind === 'tool' && m.id === msg.id
    )
    if (tool) {
      tool.result = msg.result
      tool.denied = msg.denied
      tool.needsConfirm = false
    }
    return
  }

  if (msg.type === 'permission_mode_ack') {
    permissionMode.value = msg.mode
    return
  }

  if (msg.type === 'file_picked') {
    filePickedName.value = msg.name
    filePickedContent.value = msg.content
    return
  }

  if (msg.type === 'error') {
    messages.value.push({ kind: 'error', text: msg.message })
    sending.value = false
    return
  }
})

onMounted(() => {
  post({ type: 'ready' })
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden" @click="inputAreaCloseMenu">
    <!-- MessageList will go here in Task 11 -->
    <div class="flex-1 overflow-y-auto px-4 py-3 text-[var(--vscode-foreground)]">
      <p v-if="messages.length === 0" class="text-[var(--vscode-descriptionForeground)] text-sm">
        Connecting…
      </p>
      <div v-for="(msg, i) in messages" :key="i" class="mb-2">
        <div v-if="msg.kind === 'user'" class="text-right text-sm">{{ msg.text }}</div>
        <div v-else-if="msg.kind === 'assistant'" class="text-sm whitespace-pre-wrap">{{ msg.text }}</div>
        <div v-else-if="msg.kind === 'error'" class="text-sm text-[var(--vscode-errorForeground)]">{{ msg.text }}</div>
        <div v-else-if="msg.kind === 'tool'" class="text-xs text-[var(--vscode-descriptionForeground)]">🔧 {{ msg.name }}</div>
      </div>
    </div>
    <!-- InputArea will go here in Task 14 -->
    <div class="shrink-0 px-2.5 pb-2.5 text-[var(--vscode-descriptionForeground)] text-xs">
      {{ connectionStatus }} · {{ permissionMode }}
    </div>
  </div>
</template>
