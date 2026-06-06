import * as vscode from 'vscode'
import { HolziPanel } from './HolziPanel'

export function activate(context: vscode.ExtensionContext): void {
  const openChat = vscode.commands.registerCommand('holzi.openChat', () => {
    HolziPanel.createOrShow(context)
  })

  context.subscriptions.push(openChat)
}

export function deactivate(): void {}
