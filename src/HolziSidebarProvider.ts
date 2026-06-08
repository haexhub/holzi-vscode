import * as vscode from 'vscode'
import { mergeSessions, type SessionMeta } from './sessionUtils'
import { getToken, getHost } from './config'

const CACHE_KEY = 'holzi.sessions'

export class HolziSidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView
    webviewView.webview.options = { enableScripts: true }
    webviewView.webview.onDidReceiveMessage((msg: any) => this._handleMessage(msg))
    this._render()
    this._syncSessions()
  }

  refresh(): void {
    if (this.view) {
      this._render()
      this._syncSessions()
    }
  }

  private _sessions(): SessionMeta[] {
    return this.context.globalState.get<SessionMeta[]>(CACHE_KEY) ?? []
  }

  private async _syncSessions(): Promise<void> {
    const host = getHost()
    const token = await getToken(this.context)
    if (!host || !token) return

    try {
      const res = await fetch(`${host}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const remote = await res.json()
      if (!Array.isArray(remote)) return
      const merged = mergeSessions(this._sessions(), remote as SessionMeta[])
      await this.context.globalState.update(CACHE_KEY, merged)
      await this._render()
    } catch {
      // network unavailable — keep local cache
    }
  }

  private _handleMessage(msg: any): void {
    switch (msg.type) {
      case 'new_chat':
        vscode.commands.executeCommand('holzi.openChat')
        break
      case 'open_session':
        vscode.commands.executeCommand('holzi.openChat', msg.id as string)
        break
      case 'sign_in':
        vscode.commands.executeCommand('holzi.login')
        break
      case 'configure':
        vscode.commands.executeCommand('holzi.configure')
        break
    }
  }

  private async _render(): Promise<void> {
    if (!this.view) return
    const host = getHost()
    const token = await getToken(this.context)
    const sessions = this._sessions()
    this.view.webview.html = this._buildHtml(host, token, sessions)
  }

  private _buildHtml(host: string, token: string, sessions: SessionMeta[]): string {
    const notConfigured = !host || !token
    const sessionItems = sessions.map(s => {
      const date = new Date(s.updatedAt).toLocaleDateString()
      const preview = s.lastMessage.slice(0, 60)
      return `<li class="session" data-id="${escapeAttr(s.id)}">
        <div class="session-title">${escapeHtml(s.title)}</div>
        <div class="session-preview">${escapeHtml(preview)}</div>
        <div class="session-date">${escapeHtml(date)}</div>
      </li>`
    }).join('')

    const body = notConfigured
      ? `<div class="empty">
           <p>Not connected to a Holzi server.</p>
           <button id="btn-signin">Sign In</button>
           <button id="btn-configure">Configure Server</button>
         </div>`
      : `<button id="btn-new">+ New Chat</button>
         ${sessions.length === 0
           ? '<p class="empty">No chats yet.</p>'
           : `<ul class="sessions">${sessionItems}</ul>`
         }`

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"/>
<style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 8px; margin: 0; }
  button { width: 100%; padding: 6px; margin-bottom: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; border-radius: 2px; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  ul.sessions { list-style: none; padding: 0; margin: 0; }
  li.session { padding: 6px; cursor: pointer; border-radius: 2px; margin-bottom: 2px; }
  li.session:hover { background: var(--vscode-list-hoverBackground); }
  .session-title { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .session-preview { font-size: 0.85em; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .session-date { font-size: 0.75em; opacity: 0.5; }
  .empty { text-align: center; opacity: 0.7; margin-top: 16px; }
  p.empty { text-align: center; opacity: 0.7; }
  #btn-configure { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
</style>
</head>
<body>
${body}
<script>
  const vscode = acquireVsCodeApi()
  document.getElementById('btn-new')?.addEventListener('click', () => vscode.postMessage({ type: 'new_chat' }))
  document.getElementById('btn-signin')?.addEventListener('click', () => vscode.postMessage({ type: 'sign_in' }))
  document.getElementById('btn-configure')?.addEventListener('click', () => vscode.postMessage({ type: 'configure' }))
  document.querySelectorAll('.session').forEach(el => {
    el.addEventListener('click', () => vscode.postMessage({ type: 'open_session', id: el.dataset.id }))
  })
</script>
</body>
</html>`
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
