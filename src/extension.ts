import * as vscode from 'vscode'
import { HolziPanel } from './HolziPanel'
import { HolziSidebarProvider } from './HolziSidebarProvider'
import { registerChatParticipant } from './HolziChatParticipant'

export function activate(context: vscode.ExtensionContext): void {
  // Sidebar
  const sidebarProvider = new HolziSidebarProvider(context)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('holzi.sidebarView', sidebarProvider),
  )

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.text = '$(plug) Holzi'
  statusBar.tooltip = 'Holzi: click to sign in'
  statusBar.command = 'holzi.login'
  statusBar.show()
  context.subscriptions.push(statusBar)

  // Reflect persisted auth state immediately on activation
  context.secrets.get('holzi.token').then(token => {
    if (token) {
      statusBar.text = '$(check) Holzi'
      statusBar.tooltip = 'Holzi: connected'
      statusBar.command = undefined
    }
  })

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('holzi.openChat', async (sessionId?: string) => {
      await HolziPanel.createOrShow(context, sessionId)
    }),

    vscode.commands.registerCommand('holzi.configure', async () => {
      const config = vscode.workspace.getConfiguration('holzi')
      const current = config.get<string>('host') ?? 'https://holzi.haex.cloud'
      const value = await vscode.window.showInputBox({
        title: 'Holzi: Configure Server',
        prompt: 'Enter Holzi server URL',
        value: current,
        validateInput: v => /^https?:\/\/.+/.test(v) ? null : 'Must start with http:// or https://',
      })
      if (value !== undefined) {
        await config.update('host', value.replace(/\/$/, ''), vscode.ConfigurationTarget.Global)
        vscode.window.showInformationMessage(`Holzi server set to ${value}`)
        sidebarProvider.refresh()
      }
    }),

    vscode.commands.registerCommand('holzi.openSettings', async () => {
      const host = vscode.workspace.getConfiguration('holzi').get<string>('host') ?? ''
      const token = await context.secrets.get('holzi.token')
      const choice = await vscode.window.showQuickPick(
        [
          { label: '$(link) Server URL', description: host || 'not set', id: 'host' },
          { label: '$(key) Sign In / Token', description: token ? 'configured' : 'not set', id: 'token' },
        ],
        { title: 'Holzi: Settings', placeHolder: 'What would you like to configure?' },
      )
      if (choice?.id === 'host') vscode.commands.executeCommand('holzi.configure')
      if (choice?.id === 'token') vscode.commands.executeCommand('holzi.login')
    }),

    vscode.commands.registerCommand('holzi.login', async () => {
      const config = vscode.workspace.getConfiguration('holzi')
      const value = await vscode.window.showInputBox({
        title: 'Holzi: Sign In',
        prompt: 'Enter your Bearer token',
        password: true,
        placeHolder: 'Paste token here',
      })
      if (value !== undefined && value.trim() !== '') {
        await context.secrets.store('holzi.token', value.trim())
        statusBar.text = '$(check) Holzi'
        statusBar.tooltip = 'Holzi: connected'
        statusBar.command = undefined
        vscode.window.showInformationMessage('Holzi: signed in.')
        sidebarProvider.refresh()
      }
    }),
  )

  // Chat participant (@holzi in VS Code Chat panel)
  registerChatParticipant(context)
}

export function deactivate(): void {}
