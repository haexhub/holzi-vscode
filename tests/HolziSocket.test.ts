import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebSocketServer } from 'ws'
import { HolziSocket } from '../src/HolziSocket'
import type { ServerMessage } from '../src/HolziSocket'

describe('HolziSocket', () => {
  let wss: WebSocketServer
  let port: number

  beforeAll(async () => {
    wss = new WebSocketServer({ host: '127.0.0.1', port: 0 })
    await new Promise<void>((resolve, reject) => {
      wss.once('listening', resolve)
      wss.once('error', reject)
    })
    port = (wss.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      wss.close((err) => err ? reject(err) : resolve())
    })
  })

  it('emits stream_chunk messages from server', async () => {
    const received: ServerMessage[] = []
    const socket = new HolziSocket(`ws://127.0.0.1:${port}`, 'test-token')
    socket.on('message', (m: ServerMessage) => received.push(m))

    await new Promise<void>((resolve) => {
      wss.once('connection', (ws) => {
        ws.send(JSON.stringify({ type: 'stream_chunk', delta: 'hello' }))
        setTimeout(resolve, 150)
      })
      socket.connect()
    })

    socket.disconnect()
    expect(received).toContainEqual({ type: 'stream_chunk', delta: 'hello' })
  })

  it('sends messages as JSON to server', async () => {
    const serverReceived: any[] = []
    const socket = new HolziSocket(`ws://127.0.0.1:${port}`, 'test-token')

    await new Promise<void>((resolve) => {
      wss.once('connection', (ws) => {
        ws.on('message', (raw) => {
          serverReceived.push(JSON.parse(raw.toString()))
          resolve()
        })
        socket.send({ type: 'message', content: 'hi', context: {} })
      })
      socket.connect()
    })

    socket.disconnect()
    expect(serverReceived[0]).toMatchObject({ type: 'message', content: 'hi' })
  })

  it('connected getter is true when open', async () => {
    const socket = new HolziSocket(`ws://127.0.0.1:${port}`, 'test-token')
    expect(socket.connected).toBe(false)

    await new Promise<void>((resolve) => {
      wss.once('connection', () => setTimeout(resolve, 50))
      socket.connect()
    })

    expect(socket.connected).toBe(true)
    socket.disconnect()
  })
})
