import * as vscode from 'vscode'
import { HolziSocket } from './HolziSocket'
import { ToolRegistry, PermissionMode } from './tools/index'
import { readFile, writeFile, listDir } from './tools/filesystem'
import { runCommand } from './tools/terminal'
import { getSelection, applyDiff, openFile } from './tools/editor'
import type { ServerMessage, ClientMessage } from './HolziSocket'

const ALL_TOOLS = ['read_file', 'write_file', 'list_dir', 'run_command',
                   'get_selection', 'apply_diff', 'open_file']

export function registerChatParticipant(context: vscode.ExtensionContext): void {
  // vscode.chat is only available in VS Code 1.90+
  if (!('chat' in vscode)) return

  const participant = (vscode as any).chat.createChatParticipant(
    'holzi.chat',
    async (
      request: any,
      chatContext: any,
      stream: any,
      token: vscode.CancellationToken,
    ) => {
      const config = vscode.workspace.getConfiguration('holzi')
      const host = (config.get<string>('host') ?? '').replace(/\/$/, '')
      const holziToken = config.get<string>('token') ?? ''

      if (!host || !holziToken) {
        stream.markdown('**Holzi not configured.** Run `Holzi: Configure Server` and `Holzi: Sign In` first.')
        return
      }

      const wsUrl = host.replace(/^http/, 'ws') + '/ws/agent'
      const socket = new HolziSocket(wsUrl, holziToken)
      const registry = new ToolRegistry()
      _registerTools(registry, stream)

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect()
          reject(new Error('Connection timeout'))
        }, 10000)

        socket.on('connected', () => {
          clearTimeout(timeout)

          // Build context from active editor
          const editor = vscode.window.activeTextEditor
          const ctx: Record<string, string | undefined> = {}
          if (editor) {
            ctx.active_file = editor.document.uri.fsPath
            const sel = editor.selection
            if (!sel.isEmpty) {
              ctx.selection = editor.document.getText(sel)
            }
          }

          socket.send({
            type: 'start_session',
            model: '',
            skills: [],
            permission_mode: registry.getPermissionMode(),
            tools: ALL_TOOLS,
          })

          socket.send({
            type: 'message',
            content: request.prompt as string,
            context: ctx,
          })
        })

        socket.on('message', async (msg: ServerMessage) => {
          if (token.isCancellationRequested) {
            socket.disconnect()
            resolve()
            return
          }

          switch (msg.type) {
            case 'stream_chunk':
              stream.markdown(msg.delta)
              break

            case 'stream_done':
              socket.disconnect()
              resolve()
              break

            case 'tool_call': {
              try {
                stream.progress(`Running: ${msg.name}`)
                const result = await registry.execute(msg.name, msg.params as Record<string, unknown>)
                const denied = 'error' in result && result.error === 'user_denied'
                const wire: ClientMessage = denied
                  ? { type: 'tool_result', id: msg.id, error: 'user_denied' }
                  : { type: 'tool_result', id: msg.id, result: 'result' in result ? result.result : result.error }
                socket.send(wire)
              } catch (err) {
                socket.disconnect()
                reject(err instanceof Error ? err : new Error(String(err)))
              }
              break
            }

            case 'error':
              stream.markdown(`**Error:** ${msg.message}`)
              socket.disconnect()
              resolve()
              break
          }
        })

        socket.on('error', () => {
          clearTimeout(timeout)
          socket.disconnect()
          reject(new Error('Socket error'))
        })

        socket.connect()
      }).catch((err: Error) => {
        stream.markdown(`**Connection failed:** ${err.message}`)
      })
    },
  )

  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png')
  context.subscriptions.push(participant)
}

function _registerTools(registry: ToolRegistry, stream: any): void {
  registry.register('read_file', readFile)
  registry.register('write_file', writeFile)
  registry.register('list_dir', listDir)
  registry.register('run_command', runCommand)
  registry.register('get_selection', getSelection)
  registry.register('apply_diff', applyDiff)
  registry.register('open_file', openFile)
  registry.setPermissionMode(PermissionMode.Ask)

  registry.setConfirmFn(async (toolName, params) => {
    const preview = toolName === 'apply_diff' && typeof params.patch === 'string'
      ? `\n\`\`\`diff\n${params.patch}\n\`\`\``
      : ''
    const answer = await vscode.window.showWarningMessage(
      `Holzi wants to run: ${toolName}${preview}`,
      { modal: true },
      'Allow',
      'Deny',
    )
    return answer === 'Allow'
  })
}
