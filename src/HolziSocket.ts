import WebSocket from 'ws'
import { EventEmitter } from 'events'

export type ClientMessage =
  | { type: 'start_session'; model: string; skills: string[]; permission_mode: string; tools: string[] }
  | { type: 'message'; content: string; context: Record<string, string | undefined> }
  | { type: 'tool_result'; id: string; result?: string; error?: string }
  | { type: 'update_permission_mode'; mode: string }

export type ServerMessage =
  | { type: 'stream_chunk'; delta: string }
  | { type: 'tool_call'; id: string; name: string; params: Record<string, unknown> }
  | { type: 'stream_done' }
  | { type: 'permission_mode_ack'; mode: string }
  | { type: 'error'; code: string; message: string }

export class HolziSocket extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectDelay = 1000
  private readonly maxDelay = 30000
  private shouldReconnect = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private sendQueue: string[] = []

  constructor(private readonly url: string, private readonly token: string) {
    super()
  }

  connect(): void {
    this.shouldReconnect = true
    this._open()
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.sendQueue = []
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  send(msg: ClientMessage): void {
    const payload = JSON.stringify(msg)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    } else {
      this.sendQueue.push(payload)
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private _open(): void {
    this.ws = new WebSocket(this.url, {
      headers: { Authorization: `Bearer ${this.token}` },
    })

    this.ws.on('open', () => {
      this.reconnectDelay = 1000
      const queued = this.sendQueue.splice(0)
      for (const payload of queued) {
        this.ws!.send(payload)
      }
      this.emit('connected')
    })

    this.ws.on('message', (raw: Buffer) => {
      try {
        const msg: ServerMessage = JSON.parse(raw.toString())
        this.emit('message', msg)
      } catch {
        // ignore malformed frames
      }
    })

    this.ws.on('close', () => {
      this.emit('disconnected')
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._open(), this.reconnectDelay)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
      }
    })

    this.ws.on('error', (err) => this.emit('error', err))
  }
}
