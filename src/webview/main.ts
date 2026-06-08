import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void }
const vscode = acquireVsCodeApi()
const app = createApp(App)
app.provide('vscode', vscode)
app.mount('#app')
