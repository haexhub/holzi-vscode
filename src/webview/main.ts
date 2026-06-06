// Webview-side script — runs in browser sandbox, no Node.js/vscode module imports

type ToExtension =
  | { type: 'send_message'; content: string; context: Record<string, string | undefined> }
  | { type: 'set_permission_mode'; mode: string }
  | { type: 'tool_confirm_response'; id: string; allowed: boolean }
  | { type: 'start_session'; model: string; skills: string[] }
  | { type: 'ready' }

type FromExtension =
  | { type: 'stream_chunk'; delta: string }
  | { type: 'stream_done' }
  | { type: 'status'; connected: boolean; connecting: boolean }
  | { type: 'models'; list: Array<{ id: string; display_name: string }> }
  | { type: 'tool_call_display'; id: string; name: string; params: Record<string, unknown> }
  | { type: 'tool_confirm_request'; id: string; name: string; params: Record<string, unknown>; diff?: string }
  | { type: 'tool_result_display'; id: string; result: string; denied: boolean }
  | { type: 'permission_mode_ack'; mode: string }

declare function acquireVsCodeApi(): { postMessage(msg: ToExtension): void }
const vscode = acquireVsCodeApi()

const messagesEl = document.getElementById('messages')!
const inputEl = document.getElementById('input') as HTMLTextAreaElement
const sendBtn = document.getElementById('btn-send') as HTMLButtonElement
const statusDot = document.getElementById('status-dot')!
const modelPicker = document.getElementById('model-picker') as HTMLSelectElement
const permissionPicker = document.getElementById('permission-picker') as HTMLSelectElement

let currentAssistantEl: HTMLDivElement | null = null
let sessionStarted = false

vscode.postMessage({ type: 'ready' })

// Auto-grow textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto'
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px'
})

// Enter to send, Shift+Enter for newline
inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    doSend()
  }
})

sendBtn.addEventListener('click', doSend)

permissionPicker.addEventListener('change', () => {
  vscode.postMessage({ type: 'set_permission_mode', mode: permissionPicker.value })
})

modelPicker.addEventListener('change', () => {
  vscode.postMessage({ type: 'start_session', model: modelPicker.value, skills: [] })
  sessionStarted = true
})

function doSend(): void {
  const content = inputEl.value.trim()
  if (!content) return
  inputEl.value = ''
  inputEl.style.height = 'auto'
  sendBtn.disabled = true

  appendMessage('user', content)
  currentAssistantEl = appendMessage('assistant', '')

  vscode.postMessage({ type: 'send_message', content, context: {} })
}

function appendMessage(role: 'user' | 'assistant', text: string): HTMLDivElement {
  const div = document.createElement('div')
  div.className = `message ${role}`
  div.textContent = text
  messagesEl.appendChild(div)
  div.scrollIntoView({ block: 'end' })
  return div
}

function appendToolRow(id: string, name: string, params: Record<string, unknown>): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'tool-row'
  row.id = `tool-${id}`

  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(' ')

  const header = document.createElement('div')
  header.className = 'tool-header'
  header.innerHTML = `<span class="tool-icon">&#x25CF;</span><span class="tool-name">${escHtml(name)}</span><span class="tool-params">${escHtml(paramStr)}</span>`
  header.addEventListener('click', () => row.classList.toggle('expanded'))

  const body = document.createElement('div')
  body.className = 'tool-body'

  row.appendChild(header)
  row.appendChild(body)
  messagesEl.appendChild(row)
  row.scrollIntoView({ block: 'end' })
  return row
}

window.addEventListener('message', (e: MessageEvent) => {
  const msg: FromExtension = e.data

  if (msg.type === 'status') {
    if (msg.connecting) {
      statusDot.className = 'dot connecting'
      statusDot.title = 'Connecting…'
    } else if (msg.connected) {
      statusDot.className = 'dot connected'
      statusDot.title = 'Connected'
    } else {
      statusDot.className = 'dot disconnected'
      statusDot.title = 'Disconnected'
    }
    return
  }

  if (msg.type === 'models') {
    modelPicker.innerHTML = msg.list
      .map((m) => `<option value="${escHtml(m.id)}">${escHtml(m.display_name)}</option>`)
      .join('')
    // Auto-start session with first model
    if (msg.list.length > 0 && !sessionStarted) {
      vscode.postMessage({ type: 'start_session', model: msg.list[0].id, skills: [] })
      sessionStarted = true
    }
    return
  }

  if (msg.type === 'stream_chunk') {
    if (currentAssistantEl) {
      currentAssistantEl.textContent += msg.delta
      currentAssistantEl.scrollIntoView({ block: 'end' })
    }
    return
  }

  if (msg.type === 'stream_done') {
    currentAssistantEl = null
    sendBtn.disabled = false
    return
  }

  if (msg.type === 'tool_call_display') {
    appendToolRow(msg.id, msg.name, msg.params)
    return
  }

  if (msg.type === 'tool_confirm_request') {
    const row = appendToolRow(msg.id, msg.name, msg.params)
    row.classList.add('expanded')
    const body = row.querySelector('.tool-body')!

    const diffHtml = msg.diff ? renderDiff(msg.diff) : `<pre>${escHtml(JSON.stringify(msg.params, null, 2))}</pre>`

    const confirm = document.createElement('div')
    confirm.className = 'tool-confirm'
    confirm.innerHTML = `<div class="diff-preview">${diffHtml}</div><div class="confirm-buttons"><button class="btn-allow">Allow</button><button class="btn-deny">Deny</button></div>`

    confirm.querySelector('.btn-allow')!.addEventListener('click', () => {
      vscode.postMessage({ type: 'tool_confirm_response', id: msg.id, allowed: true })
      confirm.remove()
    })
    confirm.querySelector('.btn-deny')!.addEventListener('click', () => {
      vscode.postMessage({ type: 'tool_confirm_response', id: msg.id, allowed: false })
      confirm.remove()
    })
    body.appendChild(confirm)
    return
  }

  if (msg.type === 'tool_result_display') {
    const row = document.getElementById(`tool-${msg.id}`)
    if (!row) return
    const icon = row.querySelector('.tool-icon')!
    icon.textContent = msg.denied ? '✗' : '✓'
    const body = row.querySelector('.tool-body')!
    const pre = document.createElement('pre')
    pre.textContent = msg.result
    body.appendChild(pre)
    return
  }

  if (msg.type === 'permission_mode_ack') {
    permissionPicker.value = msg.mode
    return
  }
})

function renderDiff(patch: string): string {
  return patch
    .split('\n')
    .map((line) => {
      const esc = escHtml(line)
      if (line.startsWith('+') && !line.startsWith('+++')) return `<span class="diff-add">${esc}</span>`
      if (line.startsWith('-') && !line.startsWith('---')) return `<span class="diff-del">${esc}</span>`
      return esc
    })
    .join('\n')
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
