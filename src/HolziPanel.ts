import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { HolziSocket } from './HolziSocket'
import type { ClientMessage, ServerMessage } from './HolziSocket'
import { ToolRegistry, PermissionMode } from './tools/index'
import { readFile, writeFile, listDir } from './tools/filesystem'
import { runCommand } from './tools/terminal'
import { getSelection, applyDiff, openFile } from './tools/editor'
import { getToken, getHost } from './config'
import { ALL_TOOLS } from './toolNames'

const VIEW_TYPE = 'holziChat'

export class HolziPanel {
  private static current: HolziPanel | undefined

  private readonly panel: vscode.WebviewPanel
  private readonly socket: HolziSocket
  private readonly registry: ToolRegistry
  private readonly token: string
  private readonly pendingConfirms = new Map<string, (allowed: boolean) => void>()

  static async createOrShow(context: vscode.ExtensionContext, sessionId?: string): Promise<void> {
    if (HolziPanel.current) {
      HolziPanel.current.panel.reveal()
      return
    }
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One

    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, 'Holzi', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')],
    })
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png')

    const host = getHost() || 'https://holzi.haex.cloud'
    const token = await getToken(context)
    HolziPanel.current = new HolziPanel(panel, context, host, token)
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, host: string, token: string) {
    this.panel = panel
    this.token = token
    this.registry = new ToolRegistry()
    this._registerTools()

    const wsUrl = host.replace(/^http/, 'ws') + '/ws/agent'

    this.socket = new HolziSocket(wsUrl, token)
    this._setupSocket()

    this.panel.webview.html = this._buildHtml(context)
    this.panel.webview.onDidReceiveMessage((msg: any) => this._handleWebviewMessage(msg))
    this.panel.onDidDispose(() => {
      this.socket.disconnect()
      HolziPanel.current = undefined
    })
  }

  private _registerTools(): void {
    this.registry.register('read_file', readFile)
    this.registry.register('write_file', writeFile)
    this.registry.register('list_dir', listDir)
    this.registry.register('run_command', runCommand)
    this.registry.register('get_selection', getSelection)
    this.registry.register('apply_diff', applyDiff)
    this.registry.register('open_file', openFile)

    this.registry.setConfirmFn(async (toolName, params) => {
      return new Promise<boolean>((resolve) => {
        const id = `confirm_${Date.now()}_${Math.random().toString(36).slice(2)}`
        this.pendingConfirms.set(id, resolve)
        const diff = typeof params.patch === 'string' ? params.patch : undefined
        this.panel.webview.postMessage({
          type: 'tool_confirm_request',
          id,
          name: toolName,
          params,
          diff,
        })
      })
    })
  }

  private _setupSocket(): void {
    this.socket.on('connected', () => {
      this._post({ type: 'status', connected: true, connecting: false })
      this._loadModels()
    })

    this.socket.on('disconnected', () => {
      this._post({ type: 'status', connected: false, connecting: true })
    })

    this.socket.on('error', () => {
      this._post({ type: 'status', connected: false, connecting: true })
    })

    this.socket.on('message', async (msg: ServerMessage) => {
      switch (msg.type) {
        case 'stream_chunk':
          this._post({ type: 'stream_chunk', delta: msg.delta })
          break

        case 'stream_done':
          this._post({ type: 'stream_done' })
          break

        case 'tool_call': {
          this._post({ type: 'tool_call_display', id: msg.id, name: msg.name, params: msg.params })
          const toolResult = await this.registry.execute(msg.name, msg.params as Record<string, unknown>)
          const denied = 'error' in toolResult && toolResult.error === 'user_denied'
          const resultStr = 'result' in toolResult ? toolResult.result : toolResult.error
          this._post({ type: 'tool_result_display', id: msg.id, result: resultStr, denied })
          const wireMsg: ClientMessage = denied
            ? { type: 'tool_result', id: msg.id, error: 'user_denied' }
            : 'error' in toolResult
              ? { type: 'tool_result', id: msg.id, error: toolResult.error }
              : { type: 'tool_result', id: msg.id, result: toolResult.result }
          this.socket.send(wireMsg)
          break
        }

        case 'permission_mode_ack':
          this._post({ type: 'permission_mode_ack', mode: msg.mode })
          break

        case 'error':
          this._post({ type: 'error', message: msg.message })
          this._post({ type: 'stream_done' })
          break
      }
    })

    this.socket.connect()
  }

  private async _loadModels(): Promise<void> {
    const host = getHost() || 'https://holzi.haex.cloud'
    const token = this.token
    try {
      const res = await fetch(`${host}/api/llm/models`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json() as Array<{ id: string; display_name: string }>
        this._post({ type: 'models', list: data })
      }
    } catch {
      // models endpoint unreachable — panel still usable
    }
  }

  private async _handleWebviewMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'ready':
        this._post({ type: 'status', connected: this.socket.connected, connecting: !this.socket.connected })
        break

      case 'start_session':
        this.socket.send({
          type: 'start_session',
          model: msg.model as string,
          skills: (msg.skills as string[]) ?? [],
          permission_mode: this.registry.getPermissionMode(),
          tools: ALL_TOOLS,
        })
        break

      case 'send_message':
        this.socket.send({
          type: 'message',
          content: msg.content as string,
          context: (msg.context as Record<string, string | undefined>) ?? {},
        })
        break

      case 'set_permission_mode': {
        const mode = msg.mode as PermissionMode
        this.registry.setPermissionMode(mode)
        this.socket.send({ type: 'update_permission_mode', mode })
        break
      }

      case 'tool_confirm_response': {
        const resolve = this.pendingConfirms.get(msg.id as string)
        if (resolve) {
          this.pendingConfirms.delete(msg.id as string)
          resolve(msg.allowed as boolean)
        }
        break
      }

      case 'pick_file': {
        const uris = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Attach' })
        if (uris && uris.length > 0) {
          try {
            const content = fs.readFileSync(uris[0].fsPath, 'utf-8')
            this._post({ type: 'file_picked', name: path.basename(uris[0].fsPath), content })
          } catch {
            this._post({ type: 'error', message: 'Could not read file (binary or permission denied)' })
          }
        }
        break
      }
    }
  }

  private _post(msg: Record<string, unknown>): void {
    this.panel.webview.postMessage(msg)
  }

  private _buildHtml(context: vscode.ExtensionContext): string {
    const webview = this.panel.webview
    const nonce = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
        Math.floor(Math.random() * 62)
      ],
    ).join('')

    const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'index.html')
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'out', 'webview', 'main.js'),
    )

    return fs.readFileSync(htmlPath, 'utf-8')
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace('{{MAIN_JS}}', jsUri.toString())
  }
}
