// Webview-side script — runs in browser sandbox, no Node.js/vscode module imports

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

declare function acquireVsCodeApi(): { postMessage(msg: ToExtension): void }
const vscode = acquireVsCodeApi()

const messagesEl = document.getElementById('messages')!
const inputEl = document.getElementById('input') as HTMLTextAreaElement
const sendBtn = document.getElementById('btn-send') as HTMLButtonElement
const statusDot = document.getElementById('status-dot')!
const modelPicker = document.getElementById('model-picker') as HTMLSelectElement
const slashMenu = document.getElementById('slash-menu')!
const permissionGroup = document.getElementById('permission-group')!
const effortGroup = document.getElementById('effort-group')!
const thinkingToggle = document.getElementById('thinking-toggle') as HTMLInputElement
const skillsChips = document.getElementById('skills-chips')!
const skillInput = document.getElementById('skill-input') as HTMLInputElement
const fileChipsEl = document.getElementById('file-chips')!
const modeLabelBtn = document.getElementById('btn-mode-label') as HTMLButtonElement

let currentAssistantEl: HTMLDivElement | null = null
let sessionStarted = false
let currentPermissionMode = 'ask'
let currentEffort = 'medium'
const activeSkills: string[] = []

interface AttachedFile { name: string; content: string }
const attachedFiles: AttachedFile[] = []

vscode.postMessage({ type: 'ready' })

// ── Input auto-grow ────────────────────────────────────────

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto'
  inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px'
})

inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    doSend()
  }
})

sendBtn.addEventListener('click', doSend)

// ── Slash menu toggle ──────────────────────────────────────

function openMenu(): void {
  slashMenu.classList.remove('hidden')
}
function closeMenu(): void {
  slashMenu.classList.add('hidden')
}

document.getElementById('btn-slash')!.addEventListener('click', (e) => {
  e.stopPropagation()
  slashMenu.classList.contains('hidden') ? openMenu() : closeMenu()
})

modeLabelBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  slashMenu.classList.contains('hidden') ? openMenu() : closeMenu()
})

document.addEventListener('click', (e) => {
  if (!slashMenu.classList.contains('hidden') && !slashMenu.contains(e.target as Node)) {
    closeMenu()
  }
})

slashMenu.addEventListener('click', (e) => e.stopPropagation())

// ── Model picker ───────────────────────────────────────────

modelPicker.addEventListener('change', () => {
  restartSession()
})

// ── Permission mode buttons ────────────────────────────────

permissionGroup.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-mode]')
  if (!btn) return
  currentPermissionMode = btn.dataset.mode!
  permissionGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'))
  btn.classList.add('active')
  modeLabelBtn.textContent = btn.textContent
  vscode.postMessage({ type: 'set_permission_mode', mode: currentPermissionMode })
})

// ── Effort buttons ─────────────────────────────────────────

effortGroup.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-effort]')
  if (!btn) return
  currentEffort = btn.dataset.effort!
  effortGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'))
  btn.classList.add('active')
})

// ── Skills ─────────────────────────────────────────────────

skillInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    const name = skillInput.value.trim()
    if (name && !activeSkills.includes(name)) {
      addSkill(name)
      skillInput.value = ''
      restartSession()
    }
  }
})

function addSkill(name: string): void {
  activeSkills.push(name)
  const chip = document.createElement('span')
  chip.className = 'chip'
  chip.innerHTML = `${escHtml(name)}<button class="chip-remove" aria-label="Remove skill ${escHtml(name)}">✕</button>`
  chip.querySelector('.chip-remove')!.addEventListener('click', () => {
    const idx = activeSkills.indexOf(name)
    if (idx !== -1) activeSkills.splice(idx, 1)
    chip.remove()
    restartSession()
  })
  skillsChips.appendChild(chip)
}

// ── File attach ────────────────────────────────────────────

function triggerFilePick(): void {
  vscode.postMessage({ type: 'pick_file' })
  closeMenu()
}

document.getElementById('btn-attach')!.addEventListener('click', triggerFilePick)
document.getElementById('btn-menu-attach')!.addEventListener('click', triggerFilePick)

function addFileChip(file: AttachedFile): void {
  attachedFiles.push(file)
  fileChipsEl.classList.remove('hidden')
  const chip = document.createElement('span')
  chip.className = 'chip'
  chip.innerHTML = `📎 ${escHtml(file.name)}<button class="chip-remove" aria-label="Remove ${escHtml(file.name)}">✕</button>`
  chip.querySelector('.chip-remove')!.addEventListener('click', () => {
    const idx = attachedFiles.indexOf(file)
    if (idx !== -1) attachedFiles.splice(idx, 1)
    chip.remove()
    if (attachedFiles.length === 0) fileChipsEl.classList.add('hidden')
  })
  fileChipsEl.appendChild(chip)
}

// ── Session management ─────────────────────────────────────

function restartSession(): void {
  if (!sessionStarted) return
  vscode.postMessage({ type: 'start_session', model: modelPicker.value, skills: [...activeSkills] })
}

// ── Send ───────────────────────────────────────────────────

function doSend(): void {
  const content = inputEl.value.trim()
  if (!content) return
  inputEl.value = ''
  inputEl.style.height = 'auto'
  sendBtn.disabled = true

  const context: Record<string, string> = {
    __effort: currentEffort,
    __thinking: String(thinkingToggle.checked),
  }
  for (const f of attachedFiles) {
    context[`file:${f.name}`] = f.content
  }

  appendMessage('user', content)
  currentAssistantEl = appendMessage('assistant', '')

  vscode.postMessage({ type: 'send_message', content, context })
}

// ── Message helpers ────────────────────────────────────────

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

// ── Extension message handler ──────────────────────────────

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
    if (msg.list.length > 0 && !sessionStarted) {
      vscode.postMessage({ type: 'start_session', model: msg.list[0].id, skills: [...activeSkills] })
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
    currentPermissionMode = msg.mode
    modeLabelBtn.textContent = modeLabel(msg.mode)
    permissionGroup.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === msg.mode)
    })
    return
  }

  if (msg.type === 'file_picked') {
    addFileChip({ name: msg.name, content: msg.content })
    return
  }

  if (msg.type === 'error') {
    const errEl = appendMessage('assistant', `Error: ${msg.message}`)
    errEl.style.color = 'var(--vscode-errorForeground)'
    sendBtn.disabled = false
    return
  }
})

// ── Helpers ────────────────────────────────────────────────

function modeLabel(mode: string): string {
  return { plan: 'Plan', ask: 'Ask', auto_edit: 'Auto Edit', auto: 'Auto' }[mode] ?? mode
}

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
